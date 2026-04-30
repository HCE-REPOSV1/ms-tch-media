import {
  Controller, Get, Post, Delete, Param, Res,
  UploadedFile, UseInterceptors, HttpCode, NotFoundException,
  StreamableFile, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { Request } from 'express';
import * as fs from 'fs';
import { KafkaLoggerService } from './logger/kafka-logger.service';
import { FilesService, MediaFileInfo } from './files.service';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly kafkaLogger: KafkaLoggerService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los archivos subidos en sesion' })
  findAll() {
    return this.filesService.findAll();
  }

  @Get('practitioner/:practitionerUuid/photo')
  @ApiOperation({ summary: 'Servir foto de perfil del practitioner desde el file server' })
  @ApiParam({ name: 'practitionerUuid', description: 'FHIR UUID del practitioner' })
  async serveProfilePhoto(
    @Param('practitionerUuid') practitionerUuid: string,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<StreamableFile> {
    const media = await this.filesService.resolveByPractitionerUuid(practitionerUuid);

    await this.kafkaLogger.log({
      ...this.kafkaLogger.extractAuditContext(req.headers as any),
      eventType: 'MEDIA_DOWNLOAD',
      action:    'serve-profile-photo',
      outcome:   'SUCCESS',
      message:   `Foto de perfil servida: ${media.fileName}`,
      payload:   { practitionerUuid, mediaId: media.mediaId, fileName: media.fileName },
    });

    return this.buildStreamResponse(media, req, res);
  }

  @Get('media/:mediaId/file')
  @ApiOperation({ summary: 'Servir archivo de media por ID' })
  @ApiParam({ name: 'mediaId', description: 'ID del registro en fhir.practitioner_media' })
  async serveByMediaId(
    @Param('mediaId') mediaId: string,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ): Promise<StreamableFile> {
    const media = await this.filesService.resolveByMediaId(Number(mediaId));

    await this.kafkaLogger.log({
      ...this.kafkaLogger.extractAuditContext(req.headers as any),
      eventType: 'MEDIA_DOWNLOAD',
      action:    'serve-media-file',
      outcome:   'SUCCESS',
      message:   `Archivo de media servido: ${media.fileName}`,
      payload:   { mediaId: media.mediaId, fileName: media.fileName },
    });

    return this.buildStreamResponse(media, req, res);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener metadata de un archivo subido' })
  findOne(@Param('id') id: string) {
    return this.filesService.findOne(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir un archivo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new NotFoundException('No se recibió ningún archivo');
    const result = this.filesService.saveMetadata(file);
    await this.kafkaLogger.log({
      ...this.kafkaLogger.extractAuditContext(req.headers as any),
      eventType: 'FILE_UPLOAD',
      action:    'upload-file',
      outcome:   'SUCCESS',
      message:   `Archivo subido: ${file.originalname}`,
      payload:   { id: result.id, filename: file.originalname, size: file.size, mimetype: file.mimetype },
    });
    return result;
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Descargar un archivo subido' })
  async download(@Param('id') id: string, @Res() res: Response, @Req() req: Request) {
    const filePath = this.filesService.getFilePath(id);
    const meta     = this.filesService.findOne(id);
    await this.kafkaLogger.log({
      ...this.kafkaLogger.extractAuditContext(req.headers as any),
      eventType: 'FILE_DOWNLOAD',
      action:    'download-file',
      outcome:   'SUCCESS',
      message:   `Archivo descargado: ${meta.originalName}`,
      payload:   { id, filename: meta.originalName, mimetype: meta.mimetype, size: meta.size },
    });
    res.setHeader('Content-Disposition', `attachment; filename="${meta.originalName}"`);
    res.setHeader('Content-Type', meta.mimetype);
    res.download(filePath, meta.originalName);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar un archivo subido' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    const meta = this.filesService.findOne(id);
    this.filesService.remove(id);
    await this.kafkaLogger.log({
      ...this.kafkaLogger.extractAuditContext(req.headers as any),
      eventType: 'FILE_DELETE',
      action:    'delete-file',
      outcome:   'SUCCESS',
      message:   `Archivo eliminado: ${meta.originalName}`,
      payload:   { id, filename: meta.originalName },
    });
  }

  private buildStreamResponse(
    media: MediaFileInfo,
    req: Request,
    res: Response,
  ): StreamableFile {
    const disposition  = this.filesService.resolveDisposition(media.contentType, media.fileName);
    const cacheControl = this.filesService.resolveCacheControl(media.contentType);
    const isVideo      = media.contentType.startsWith('video/');

    res.setHeader('Content-Type',        media.contentType);
    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Cache-Control',       cacheControl);
    res.setHeader('Accept-Ranges',       'bytes');

    const rangeHeader = req.headers['range'];
    if (isVideo && rangeHeader) {
      const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
      if (match) {
        const start     = match[1] ? parseInt(match[1], 10) : 0;
        const end       = match[2] ? parseInt(match[2], 10) : media.fileSize - 1;
        const chunkSize = end - start + 1;

        res.status(206);
        res.setHeader('Content-Range',  `bytes ${start}-${end}/${media.fileSize}`);
        res.setHeader('Content-Length', String(chunkSize));

        return new StreamableFile(
          fs.createReadStream(media.fullPath, { start, end }),
          { type: media.contentType },
        );
      }
    }

    res.setHeader('Content-Length', String(media.fileSize));
    return new StreamableFile(
      fs.createReadStream(media.fullPath),
      { type: media.contentType },
    );
  }
}

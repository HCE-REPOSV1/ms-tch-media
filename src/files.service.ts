import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface FileMetadata {
  id:           string;
  originalName: string;
  filename:     string;
  mimetype:     string;
  size:         number;
  path:         string;
  createdAt:    string;
}

export interface MediaFileInfo {
  fullPath:     string;
  fileName:     string;
  contentType:  string;
  mediaId:      number;
  fileSize:     number;
}

@Injectable()
export class FilesService {
  private readonly store: FileMetadata[] = [];

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  saveMetadata(file: Express.Multer.File): FileMetadata {
    const entry: FileMetadata = {
      id:           uuidv4(),
      originalName: file.originalname,
      filename:     file.filename,
      mimetype:     file.mimetype,
      size:         file.size,
      path:         file.path,
      createdAt:    new Date().toISOString(),
    };
    this.store.push(entry);
    return entry;
  }

  findAll(): FileMetadata[]  { return this.store; }

  findOne(id: string): FileMetadata {
    const f = this.store.find(m => m.id === id);
    if (!f) throw new NotFoundException(`Archivo ${id} no encontrado`);
    return f;
  }

  getFilePath(id: string): string { return this.findOne(id).path; }

  remove(id: string): void {
    const f   = this.findOne(id);
    const idx = this.store.indexOf(f);
    if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    this.store.splice(idx, 1);
  }

  async resolveByPractitionerUuid(practitionerUuid: string): Promise<MediaFileInfo> {
    const rows = await this.dataSource.query<Array<{
      media_id: number; media_file_name: string;
      relative_path: string; content_type: string; base_url: string;
    }>>(`
      SELECT TOP 1
          m.media_id,
          m.media_file_name,
          m.relative_path,
          m.content_type,
          fs.base_url
      FROM fhir.practitioner_media m
      INNER JOIN cfg.file_server_config fs
             ON fs.config_id = m.file_server_config_id AND fs.is_active = 1
      INNER JOIN fhir.practitioner p
             ON p.practitioner_id = m.practitioner_id AND p.is_active = 1
      WHERE p.practitioner_uuid = @0
        AND m.is_primary = 1
        AND m.is_active  = 1
    `, [practitionerUuid]);

    if (!rows.length) {
      throw new NotFoundException(`Foto de perfil no encontrada para practitioner: ${practitionerUuid}`);
    }
    return this.buildMediaFileInfo(rows[0]);
  }

  async resolveByMediaId(mediaId: number): Promise<MediaFileInfo> {
    const rows = await this.dataSource.query<Array<{
      media_id: number; media_file_name: string;
      relative_path: string; content_type: string; base_url: string;
    }>>(`
      SELECT TOP 1
          m.media_id,
          m.media_file_name,
          m.relative_path,
          m.content_type,
          fs.base_url
      FROM fhir.practitioner_media m
      INNER JOIN cfg.file_server_config fs
             ON fs.config_id = m.file_server_config_id AND fs.is_active = 1
      WHERE m.media_id  = @0
        AND m.is_active = 1
    `, [mediaId]);

    if (!rows.length) {
      throw new NotFoundException(`Media no encontrado: ${mediaId}`);
    }
    return this.buildMediaFileInfo(rows[0]);
  }

  // Determina Content-Disposition segun el tipo MIME
  resolveDisposition(contentType: string, fileName: string): string {
    const inline = ['image/', 'video/', 'audio/', 'application/pdf'];
    const isInline = inline.some(prefix => contentType.startsWith(prefix));
    const verb = isInline ? 'inline' : 'attachment';
    return `${verb}; filename="${fileName}"`;
  }

  // Cache agresivo para media publico; sin cache para documentos sensibles
  resolveCacheControl(contentType: string): string {
    if (contentType.startsWith('image/')) return 'public, max-age=86400';  // 24h
    if (contentType.startsWith('video/')) return 'public, max-age=3600';   // 1h
    if (contentType.startsWith('audio/')) return 'public, max-age=3600';
    return 'private, no-cache';                                             // docs/certs
  }

  private buildMediaFileInfo(row: {
    media_id: number; media_file_name: string;
    relative_path: string; content_type: string; base_url: string;
  }): MediaFileInfo {
    const fullPath = this.resolvePath(row.base_url, row.relative_path);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(
        `Archivo no encontrado en el file server: ${row.media_file_name} | path: ${fullPath}`,
      );
    }

    return {
      fullPath,
      fileName:    row.media_file_name,
      contentType: row.content_type,
      mediaId:     row.media_id,
      fileSize:    fs.statSync(fullPath).size,
    };
  }

  private resolvePath(baseUrl: string, relativePath: string): string {
    const isWindows = process.platform === 'win32';
    const isUncBase  = baseUrl.startsWith('\\\\') || baseUrl.startsWith('//');
    const isUnixBase = baseUrl.startsWith('/');

    if (isUncBase) {
      if (isWindows) {
        // Windows + UNC (caso nativo)
        const base = baseUrl.replace(/[/\\]$/, '');
        const rel  = relativePath.startsWith('/') || relativePath.startsWith('\\')
          ? relativePath : `\\${relativePath}`;
        return (base + rel).replace(/\//g, '\\');
      }
      // Linux + UNC → necesita mount point configurado en FILE_SERVER_LINUX_BASE
      const linuxBase = process.env.FILE_SERVER_LINUX_BASE;
      if (!linuxBase) throw new Error(
        'La DB tiene una ruta UNC pero el servicio corre en Linux. Configura FILE_SERVER_LINUX_BASE en .env apuntando al mount point del share.',
      );
      const rel = relativePath.replace(/\\/g, '/');
      return `${linuxBase.replace(/\/$/, '')}${rel.startsWith('/') ? rel : `/${rel}`}`;
    }

    if (isUnixBase) {
      if (!isWindows) {
        // Linux + path Unix (caso nativo)
        const base = baseUrl.replace(/\/$/, '');
        const rel  = relativePath.replace(/\\/g, '/');
        return `${base}${rel.startsWith('/') ? rel : `/${rel}`}`;
      }
      // Windows (dev) + path Unix → necesita mapeo configurado en FILE_SERVER_WIN_BASE
      const winBase = process.env.FILE_SERVER_WIN_BASE;
      if (!winBase) throw new Error(
        'La DB tiene una ruta Unix pero el servicio corre en Windows. Configura FILE_SERVER_WIN_BASE en .env (ej: \\\\192.168.22.39\\Share o Z:\\).',
      );
      const rel = relativePath.replace(/\//g, '\\');
      return `${winBase.replace(/[/\\]$/, '')}${rel.startsWith('\\') ? rel : `\\${rel}`}`;
    }

    throw new Error(`base_url con formato no reconocido: ${baseUrl}`);
  }
}

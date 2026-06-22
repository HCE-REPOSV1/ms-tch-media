import { Inject, Injectable } from '@nestjs/common';
import {
  MEDIA_REPOSITORY, MediaRepository, FileMetadata, MediaFileInfo,
} from '../../domain/repositories/media.repository';

@Injectable()
export class MediaUseCase {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly mediaRepository: MediaRepository,
  ) {}

  upload(file: Express.Multer.File): FileMetadata {
    return this.mediaRepository.saveMetadata(file);
  }

  findAll(): FileMetadata[] {
    return this.mediaRepository.findAll();
  }

  findOne(id: string): FileMetadata {
    return this.mediaRepository.findOne(id);
  }

  getFilePath(id: string): string {
    return this.mediaRepository.getFilePath(id);
  }

  remove(id: string): void {
    this.mediaRepository.remove(id);
  }

  resolveByPractitionerUuid(practitionerUuid: string): Promise<MediaFileInfo> {
    return this.mediaRepository.resolveByPractitionerUuid(practitionerUuid);
  }

  resolveByMediaId(mediaId: number): Promise<MediaFileInfo> {
    return this.mediaRepository.resolveByMediaId(mediaId);
  }

  resolveDisposition(contentType: string, fileName: string): string {
    return this.mediaRepository.resolveDisposition(contentType, fileName);
  }

  resolveCacheControl(contentType: string): string {
    return this.mediaRepository.resolveCacheControl(contentType);
  }
}

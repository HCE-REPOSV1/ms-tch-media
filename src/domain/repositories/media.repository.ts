export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');

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

/**
 * Puerto hacia el origen de datos de media: metadata en memoria (uploads de sesión)
 * y la consulta cruzada fhir.practitioner_media + cfg.file_server_config en SQL Server.
 * El único adapter (MediaTypeOrmRepository) implementa ambos accesos.
 */
export interface MediaRepository {
  saveMetadata(file: Express.Multer.File): FileMetadata;
  findAll(): FileMetadata[];
  findOne(id: string): FileMetadata;
  getFilePath(id: string): string;
  remove(id: string): void;
  resolveByPractitionerUuid(practitionerUuid: string): Promise<MediaFileInfo>;
  resolveByMediaId(mediaId: number): Promise<MediaFileInfo>;
  resolveDisposition(contentType: string, fileName: string): string;
  resolveCacheControl(contentType: string): string;
}

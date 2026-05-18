export interface AdminFileResponse {
  id: string;
  name: string;
  type: string;
  source: string;
  uploader: string;
  uploadedAt: Date;
  ref: string;
}

export interface UploadedFilePayload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface FileUploadResponse {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  category: string;
  isSensitive: boolean;
}

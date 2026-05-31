import { Injectable } from '@angular/core';
import imageCompression from 'browser-image-compression';

export const DEFAULT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const SKIP_COMPRESS_BELOW_BYTES = 200 * 1024;
export const DEFAULT_MAX_IMAGE_DIMENSION = 1920;
export const DEFAULT_IMAGE_QUALITY = 0.8;

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export type UploadPrepareMode = 'imageOnly' | 'attachments';

export type UploadPrepareErrorCode =
  | 'UNSUPPORTED_TYPE'
  | 'FILE_TOO_LARGE'
  | 'FILE_TOO_LARGE_AFTER_COMPRESSION'
  | 'COMPRESSION_FAILED';

export class UploadPrepareError extends Error {
  constructor(
    public readonly code: UploadPrepareErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'UploadPrepareError';
  }
}

export interface UploadPrepareOptions {
  maxBytes?: number;
  maxImageDimension?: number;
  imageQuality?: number;
  mode: UploadPrepareMode;
  /** When false, images are uploaded at original quality (size limit still applies). */
  compressImages?: boolean;
}

export interface PrepareUploadResult {
  file: File;
  contentType: string;
  originalSize: number;
  finalSize: number;
  compressed: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FileUploadPreprocessorService {
  resolveContentTypeForUpload(file: File, mode: UploadPrepareMode): string {
    return this.resolveContentType(file, mode);
  }

  async prepareForUpload(
    file: File,
    options: UploadPrepareOptions,
  ): Promise<PrepareUploadResult> {
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_FILE_BYTES;
    const maxImageDimension = options.maxImageDimension ?? DEFAULT_MAX_IMAGE_DIMENSION;
    const imageQuality = options.imageQuality ?? DEFAULT_IMAGE_QUALITY;
    const originalSize = file.size;
    const contentType = this.resolveContentType(file, options.mode);

    if (this.isDocumentType(contentType)) {
      if (file.size > maxBytes) {
        throw new UploadPrepareError(
          'FILE_TOO_LARGE',
          `File exceeds the ${this.formatBytes(maxBytes)} limit.`,
        );
      }
      return {
        file,
        contentType,
        originalSize,
        finalSize: file.size,
        compressed: false,
      };
    }

    const compressImages = options.compressImages !== false;

    if (!compressImages) {
      if (file.size > maxBytes) {
        throw new UploadPrepareError(
          'FILE_TOO_LARGE',
          `File exceeds the ${this.formatBytes(maxBytes)} limit.`,
        );
      }
      return {
        file,
        contentType,
        originalSize,
        finalSize: file.size,
        compressed: false,
      };
    }

    if (file.size < SKIP_COMPRESS_BELOW_BYTES) {
      if (file.size > maxBytes) {
        throw new UploadPrepareError(
          'FILE_TOO_LARGE',
          `File exceeds the ${this.formatBytes(maxBytes)} limit.`,
        );
      }
      return {
        file,
        contentType,
        originalSize,
        finalSize: file.size,
        compressed: false,
      };
    }

    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: maxBytes / (1024 * 1024),
        maxWidthOrHeight: maxImageDimension,
        useWebWorker: true,
        initialQuality: imageQuality,
      });

      if (compressedFile.size > maxBytes) {
        throw new UploadPrepareError(
          'FILE_TOO_LARGE_AFTER_COMPRESSION',
          `Image is too large even after optimization (max ${this.formatBytes(maxBytes)}). Try a smaller photo.`,
        );
      }

      return {
        file: compressedFile,
        contentType,
        originalSize,
        finalSize: compressedFile.size,
        compressed: compressedFile.size < originalSize,
      };
    } catch (error) {
      if (error instanceof UploadPrepareError) {
        throw error;
      }
      throw new UploadPrepareError(
        'COMPRESSION_FAILED',
        'Could not optimize the image. Try another file or a smaller photo.',
      );
    }
  }

  willCompressImage(file: File, options: UploadPrepareOptions): boolean {
    if (options.compressImages === false) {
      return false;
    }
    try {
      const contentType = this.resolveContentType(file, options.mode);
      if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
        return false;
      }
      return file.size >= SKIP_COMPRESS_BELOW_BYTES;
    } catch {
      return false;
    }
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private resolveContentType(file: File, mode: UploadPrepareMode): string {
    const browserType = this.normalizeBrowserType(file.type);
    if (browserType && this.isAllowedType(browserType, mode)) {
      return browserType;
    }

    const extension = this.getFileExtension(file.name);
    const fromExtension = extension ? EXTENSION_TO_MIME[extension] : undefined;
    if (fromExtension && this.isAllowedType(fromExtension, mode)) {
      return fromExtension;
    }

    throw new UploadPrepareError(
      'UNSUPPORTED_TYPE',
      mode === 'imageOnly'
        ? 'Could not detect file type. Use a .jpg, .jpeg, .png, .webp, .gif, or .bmp image.'
        : 'Could not detect file type. Use .jpg, .png, .webp, .gif, .bmp, .pdf, .doc, .docx, .xls, or .xlsx.',
    );
  }

  private normalizeBrowserType(type: string): string | null {
    const trimmed = type?.trim();
    if (!trimmed || trimmed === 'application/octet-stream') {
      return null;
    }
    if (trimmed === 'image/jpg') {
      return 'image/jpeg';
    }
    return trimmed;
  }

  private getFileExtension(fileName: string): string | null {
    const baseName = fileName.replace(/[/\\]/g, '_').trim();
    const lastDot = baseName.lastIndexOf('.');
    if (lastDot <= 0 || lastDot === baseName.length - 1) {
      return null;
    }
    return baseName.slice(lastDot + 1).toLowerCase();
  }

  private isAllowedType(type: string, mode: UploadPrepareMode): boolean {
    if (ALLOWED_IMAGE_TYPES.has(type)) {
      return true;
    }
    if (mode === 'attachments' && ALLOWED_DOCUMENT_TYPES.has(type)) {
      return true;
    }
    return false;
  }

  private isDocumentType(type: string): boolean {
    return ALLOWED_DOCUMENT_TYPES.has(type);
  }
}

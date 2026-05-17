import { HttpStatus, Injectable } from '@nestjs/common';

import { AppError } from '../common/errors/app-error';
import { ERROR_CODES } from '../common/errors/error-codes';

export interface FileUploadPolicy {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

@Injectable()
export class FilePolicyService {
  readonly defaultPolicy: FileUploadPolicy = {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  };

  assertCanAccess(canAccess: boolean): void {
    if (!canAccess) {
      throw new AppError(
        ERROR_CODES.FILE_FORBIDDEN,
        '附件无查看权限',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}

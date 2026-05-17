import { HttpException, HttpStatus } from '@nestjs/common';

import { ErrorCode } from './error-codes';

export interface ErrorResponse {
  success: false;
  code: ErrorCode;
  message: string;
}

export class AppError extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        success: false,
        code,
        message,
      } satisfies ErrorResponse,
      status,
    );
  }
}

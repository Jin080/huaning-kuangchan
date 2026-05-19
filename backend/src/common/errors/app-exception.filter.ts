import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { ERROR_CODES } from './error-codes';

interface ErrorBody {
  success: false;
  code: string;
  message: string;
}

interface JsonResponse {
  status(statusCode: number): {
    json(body: ErrorBody): void;
  };
}

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<JsonResponse>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json(this.toErrorBody(exception));
  }

  private toErrorBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      if (this.isErrorBody(body)) {
        return body;
      }

      return {
        success: false,
        code: statusToCode(exception.getStatus()),
        message: this.extractMessage(body),
      };
    }

    return {
      success: false,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '服务器内部错误',
    };
  }

  private isErrorBody(body: unknown): body is ErrorBody {
    return (
      typeof body === 'object' &&
      body !== null &&
      'success' in body &&
      'code' in body &&
      'message' in body &&
      body.success === false
    );
  }

  private extractMessage(body: unknown): string {
    if (typeof body === 'string') {
      return body;
    }

    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = body.message;

      if (Array.isArray(message)) {
        return message.join('; ');
      }

      if (typeof message === 'string') {
        return message;
      }
    }

    return '请求处理失败';
  }
}

function statusToCode(status: number): string {
  if (status === HttpStatus.UNAUTHORIZED) {
    return ERROR_CODES.UNAUTHORIZED;
  }

  if (status === HttpStatus.FORBIDDEN) {
    return ERROR_CODES.FORBIDDEN;
  }

  return ERROR_CODES.INTERNAL_ERROR;
}

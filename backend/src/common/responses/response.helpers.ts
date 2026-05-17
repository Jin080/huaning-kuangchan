import { ListResponse, OperationResponse } from './response.types';

export function createListResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): ListResponse<T> {
  return {
    items,
    total,
    page,
    pageSize,
  };
}

export function createOperationResponse(message: string): OperationResponse {
  return {
    success: true,
    message,
  };
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OperationResponse {
  success: true;
  message: string;
}

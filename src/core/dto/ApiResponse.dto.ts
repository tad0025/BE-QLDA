export class ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };

  constructor(success: boolean, message?: string, data?: T) {
    this.success = success;
    if (message) this.message = message;
    if (data !== undefined) this.data = data;
  }
}

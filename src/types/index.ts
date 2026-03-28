// API 回傳格式
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// 搜尋參數
export interface SearchParams {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// 異動類型
export type ChangeType = "新增" | "調價" | "停用";

// 資料表名稱
export type TableName = "drugs" | "devices" | "payments";

// 同步狀態
export type SyncStatus = "success" | "failed";

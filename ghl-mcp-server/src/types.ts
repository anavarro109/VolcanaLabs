export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// GHL resources are large and evolving; we type the fields we rely on
// directly and allow any additional fields the API returns.
export interface GHLRecord {
  id?: string;
  locationId?: string;
  [key: string]: unknown;
}

export interface PaginatedResult<T = GHLRecord> {
  total: number;
  count: number;
  offset: number;
  items: T[];
  has_more: boolean;
  next_offset?: number;
}

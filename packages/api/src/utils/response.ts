export interface ApiResponse<TData> {
  success:       boolean
  data:          TData | null
  error:         string | null
  correlationId: string
}

export function ok<TData>(
  data: TData,
  correlationId: string
): ApiResponse<TData> {
  return { success: true, data, error: null, correlationId }
}

export function fail<TData = null>(
  error: string,
  correlationId: string
): ApiResponse<TData> {
  return { success: false, data: null, error, correlationId }
}
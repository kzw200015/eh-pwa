type ErrorStatus = 400 | 401 | 403 | 404 | 429 | 500 | 502 | 503

/**
 * 可预期的失败：抛出后由应用统一回成 `{code, message}`，code 与 HTTP 状态码相同。
 *
 * message 原样给用户看，不放上游原话、地址这类细节；细节作为 cause 交出，要进日志的由抛出方自己记。
 */
export class HttpError extends Error {
  readonly status: ErrorStatus

  constructor(status: ErrorStatus, message: string, options?: ErrorOptions) {
    super(message, options)
    this.status = status
  }

  get body() {
    return { code: this.status, message: this.message }
  }
}

export const badRequest = (message: string) => new HttpError(400, message)
export const unauthorized = (message: string) => new HttpError(401, message)
export const forbidden = (message: string) => new HttpError(403, message)
export const notFound = (message: string) => new HttpError(404, message)
export const tooManyRequests = (message: string) => new HttpError(429, message)
export const badGateway = (message: string, options?: ErrorOptions) => new HttpError(502, message, options)
export const serviceUnavailable = (message: string) => new HttpError(503, message)

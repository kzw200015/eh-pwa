import type { Outbound, OutboundInit } from "@server/outbound-fetch"
import { present } from "./present"

/** 发往外部网站的一次请求，按发出的顺序记下来。 */
export interface RecordedRequest {
  url: URL
  method: string
  headers: Record<string, string>
  body: string | undefined
}

/** 按请求给出响应；给不出（返回 undefined）就当作测试没配这个请求，回 unconfigured()。 */
export type Responder = (request: RecordedRequest) => Response | undefined | Promise<Response | undefined>

/** 测试没给出响应的请求：599 不是哪个真实网站会回的状态码，一眼认得出是测试漏配了。 */
export const unconfigured = () => new Response("未配置的请求", { status: 599 })

/**
 * 假的外部网站：替换掉真实的出网，按请求回放内存里的响应，并记下每个请求。
 * 请求照样走完服务端的整条链路（拼地址、带 Cookie、认「200 但不是内容」），只在出网这一步换掉。
 */
export class FakeOutbound {
  readonly requests: RecordedRequest[] = []

  respond: Responder

  constructor(respond: Responder = unconfigured) {
    this.respond = respond
  }

  readonly fetch: Outbound = async (url: string, init: OutboundInit = {}) => {
    const request: RecordedRequest = {
      url: new URL(url),
      method: init.method ?? "GET",
      headers: Object.fromEntries(
        Object.entries(init.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
      ),
      body: init.body,
    }
    this.requests.push(request)
    return (await this.respond(request)) ?? unconfigured()
  }

  /** 最近发出的一个请求；一个都没发过就当场失败。 */
  last(): RecordedRequest {
    return present(this.requests.at(-1), "出网请求")
  }

  /** 发往某个主机的请求。 */
  to(host: string): RecordedRequest[] {
    return this.requests.filter((request) => request.url.host === host)
  }
}

export function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=UTF-8" } })
}

export function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } })
}

import { stripVTControlCharacters } from "node:util"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { logger as requestLogger } from "hono/logger"

import { authRoutes } from "@server/auth/auth-routes"
import { ehRoutes } from "@server/eh/eh-routes"
import { healthRoutes } from "@server/health/health-routes"
import { createLogger } from "@server/logger"
import { staticFiles } from "@server/static-files"

const logger = createLogger(import.meta.url)

/**
 * 整个应用：接口一律挂在 /api 下，各领域的路由只写领域内的路径；其余路径是前端的静态文件。
 * 前端从这里的 App 类型推断每条接口的入参与响应（hono/client），所以路由的写法就是接口契约。
 * 路由要一路链式写下来：拆成几条语句的话，App 类型里就没有后面挂上的那些接口了。
 */
export const app = new Hono()
  /*
   * Hono 自带的请求日志，只挂在 /api 下，前端静态文件不记。转进 pino，并去掉查询串：图片地址的查询串里是签名。
   * 它不看是不是终端、只认 NO_COLOR，给状态码加的着色符也在这里去掉。图片接口是边读边转发的，耗时只算到开始发图。
   */
  .use(
    "/api/*",
    requestLogger((line) => logger.info(stripVTControlCharacters(line).replace(/\?\S*/, ""))),
  )
  .route("/api", new Hono().route("/auth", authRoutes).route("/eh", ehRoutes).route("/health", healthRoutes))
  .route("/", staticFiles)
  /*
   * 所有失败都回成 `{code, message}`，code 与 HTTP 状态码相同。可预期的失败抛 HTTPException，自己带着状态码与给用户看的
   * 文案（入参不合格见 validate.ts）；未预料的异常回 500，原文只进日志。
   */
  .onError((error, c) => {
    if (!(error instanceof HTTPException)) {
      logger.error(error, "未预料的异常")
      return c.json({ code: 500, message: "服务器出错了" }, 500)
    }
    return c.json({ code: error.status, message: error.message }, error.status)
  })
  /* /api 下写错的路径、方法不对的请求，以及找不到的静态文件，拿到的都是 JSON 的 404 而不是一个页面 */
  .notFound((c) => c.json({ code: 404, message: "这个地址不存在" }, 404))

export type App = typeof app

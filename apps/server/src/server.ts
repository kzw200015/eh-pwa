import { app } from "@server/app"
import { closeDatabase, migrateDatabase } from "@server/database/connection"

/**
 * 按启动顺序把服务准备好并开始监听，交回监听中的服务器，以及关停（等在途的请求处理完再停止监听、关掉连接池）。
 * 先执行迁移，再监听端口。迁移失败原样抛出，进程随之退出。
 */
export async function startServer(listen: { port: number; hostname?: string }) {
  await migrateDatabase()
  /* Bun 默认 10 秒没有收发就断开连接，手动同步标签译名这类要等十几秒的请求会被掐断 */
  const server = Bun.serve({ ...listen, fetch: app.fetch, idleTimeout: 30 })
  return {
    server,
    async close() {
      await server.stop()
      await closeDatabase()
    },
  }
}

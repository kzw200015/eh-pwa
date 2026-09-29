# eh-pwa

自托管的 E-Hentai / ExHentai 图集浏览器，做成可安装的 PWA，手机和电脑上都能用。

服务端代你访问 e 站：你在设置页绑定自己的 e 站 Cookie，搜索、详情、评论与图片都经服务端取回，浏览器不直接连 e 站。

## 功能

- 图集搜索：关键词、分类与最低评分筛选，搜索历史跨设备同步
- 图集详情：元数据、标签、预览图与评论
- 阅读器：连续滚动阅读、自动翻页，阅读进度与阅读历史跨设备同步
- 标签中文译名：来自 [EhTagTranslation](https://github.com/EhTagTranslation/Database)，在设置页手动同步
- 绑定带里站权限的 Cookie 后可浏览 exhentai.org
- 多账号：每个账号各自绑定 e 站 Cookie，偏好与阅读记录互不相干

## 部署

需要一个 PostgreSQL 数据库。服务启动时会自动执行迁移，数据库账号要有建表、改表的权限。

```bash
docker run -d --name eh-pwa -p 8000:8000 \
  -e DATABASE_URL=postgres://用户:口令@主机:5432/eh_pwa \
  -e SECRET_KEY="$(openssl rand -hex 32)" \
  -e ALLOW_REGISTRATION=true \
  -e TZ=Asia/Shanghai \
  kzw200015/eh-pwa
```

打开 `http://localhost:8000`，注册第一个账号后，把 `ALLOW_REGISTRATION` 去掉（默认关闭）再重启容器，然后在设置页绑定 e 站 Cookie。

`SECRET_KEY` 请生成一次后固定保存：换掉它，所有人都要重新登录。

| 环境变量             | 默认值         | 说明                                                             |
| -------------------- | -------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`       | 必填           | PostgreSQL 连接串                                                |
| `SECRET_KEY`         | 必填           | 至少 32 字节，登录令牌与图片地址的签名密钥都由它派生             |
| `ALLOW_REGISTRATION` | `false`        | 是否开放注册                                                     |
| `TOKEN_TTL`          | `30d`          | 登录令牌有效期                                                   |
| `ATTACHMENT_TTL`     | `24h`          | 签名图片地址的有效期                                             |
| `EH_REQUEST_TIMEOUT` | `30s`          | 出网请求的超时，按多久没收到数据算                               |
| `EH_USER_AGENT`      | 桌面版 Chrome  | 出网请求用的 User-Agent                                          |
| `PORT`               | `8000`         | 监听端口                                                         |

健康检查：`/api/health/live`（进程存活）、`/api/health/ready`（数据库可用）。

> e 站 Cookie 以明文存进数据库，持有它就等于持有那个 e 站账号。请只给信任的人开账号，公网部署时建议保持注册关闭。

## 开发

需要 [Bun](https://bun.sh)、Node 24（前端工具链跑在 Node 上），以及 PostgreSQL；跑后端测试还需要 Docker。

```bash
bun install
cp apps/server/.env.example apps/server/.env   # 填 DATABASE_URL 和 SECRET_KEY
bun run dev                                    # 后端 :8000，Vite 开发服务器把 /api 代理过去
```

常用命令：`bun run test`、`bun run typecheck`、`bun run lint`、`bun run format`、`bun run build`。

技术栈：后端 Hono + Drizzle + PostgreSQL，由 Bun 直接运行；前端 Vue 3 + Vite + Pinia Colada + shadcn-vue。项目结构与约定见 [AGENTS.md](AGENTS.md)，领域术语见 [CONTEXT.md](CONTEXT.md)，架构决策见 [docs/adr](docs/adr)。

## 许可证

[MIT](LICENSE)

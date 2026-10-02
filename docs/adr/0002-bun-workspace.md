# 前后端组成 Bun 工作区，后端由 Bun 直接运行源码，共享包只放两端都执行的规则

入参规则（搜索词不超过 200 字节、搜索历史最多 10 条、自动翻页间隔 1–20 秒）前端提交前要先挡、后端校验时也要执行，各写一份就会漂移。所以仓库是一个 Bun 工作区：`apps/server`、`apps/web`，外加 `packages/shared` 放这些两端都执行的规则（zod schema、取值范围、改本地数据的规则函数）。接口的形状不放共享包，由前端从后端推断（见 ADR-0003）。

后端由 Bun 直接运行 `src/main.ts`：它照 tsconfig 解析路径别名，不用编译、导入也不必写 `.js` 后缀。共享包只有源码，`exports` 直接指向 `src/*.ts`，Bun、Vite、vue-tsc、Vitest 都把它当普通依赖解析，一处别名也不用配，改了两端直接看见。能用 Bun 原生 API 的地方用它：密码哈希 `Bun.password`，哈希与 HMAC `Bun.CryptoHasher`，数据库 `Bun.sql`（Drizzle 的 `bun-sql` 驱动），出网用 Bun 的 fetch。

几处取舍：

- **前端工具链留在 Node**：vue-tsc 要靠 Node 的模块加载改写 TypeScript，在 Bun 下认不出 `.vue`。Bun 只负责装依赖、启动脚本，Vite、vue-tsc、前端的 Vitest 按 shebang 跑在 Node 上。
- **出网的超时自己计，不用 Bun fetch 的 `timeout` 选项**：它按套接字算空闲、4 秒一档取整，表达不了「只在调用方来读时计时」。连接阶段约 10 秒的超时靠 Bun fetch 的默认行为（实测，文档未写明）。

## Consequences

- 本机与镜像的构建阶段要同时有 Bun 和 Node；镜像的运行时阶段只有 Bun。
- Bun 不做类型检查，后端与共享包的类型错误只有 `bun run typecheck` 能发现，提交前要跑。
- `Bun.sql` 第一次查询就把连接池开满（默认 10 个），生产环境常驻 10 个数据库连接；测试库的连接上限要调高。
- 共享包里的代码由两端各自的配置编译：不能用路径别名，只能用 ES 标准库（不碰 Web API 或 Bun API）。
- 连接阶段的超时依赖 Bun 未写进文档的默认行为，升级 Bun 后要复核。

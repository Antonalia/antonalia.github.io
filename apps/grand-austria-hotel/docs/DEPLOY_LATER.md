# 公网联机部署与GitHub发布

用户已授权将源码和页面上传GitHub。完整项目位于博客仓库`apps/grand-austria-hotel/`，下列公网联机配置仍待执行；当前没有创建云数据库或部署API。GitHub Pages未设置API来源时展示“公网联机尚未启用”，不会开放无密码对局。

## 后端：专用Vercel与Neon

1. 继续使用已有账号，为游戏新建独立Neon项目及独立Vercel项目。不要把游戏表或迁移放进Waline生产数据库。
2. 以管理员在新游戏数据库执行 `db/schema.sql`。另外用SQL创建一个受限LOGIN角色并授予 `hotel_player_api`，将其连接串作为游戏应用连接。不要使用带 `neon_superuser` 权限的管理员连接。
3. Vercel使用本项目源代码，Node.js22以上。配置服务端环境变量：

| 名称 | 内容 |
| --- | --- |
| `GAME_DATABASE_URL` | 游戏专用受限数据库连接串，仅服务端 |
| `GAME_PASSWORD_HASH` | `node scripts/hash-password.mjs` 生成的scrypt哈希 |
| `ALLOWED_ORIGINS` | `https://antonalia.github.io`；如需后端域名自己预览，也显式加入该HTTPS来源，用逗号分隔 |

4. `/api/health` 应返回configured=true；未配置时API拒绝服务。公网没有初始密码设置接口，密码由部署环境配置。
5. 确认平台级登录/建房/操作限流、用量提醒和可用的预算动作。应用内存限流不能覆盖多个函数实例。Vercel预算动作可能涉及同团队所有项目，配置前核对对Waline的影响。
6. 使用实际iPad Safari和两台独立设备验证来源、登录、重连、隐藏手牌、并发与七轮结束。当前未连接真实Neon项目，不能把本地通过等同于公网数据库已验证。

会话和过期对局可以定期维护：

```sql
DELETE FROM hotel.sessions WHERE expires_at < now();
DELETE FROM hotel.rooms WHERE expires_at < now();
```

## 前端：GitHub博客隐藏路径

后端就绪后，构建公开静态包（把示例域名换成游戏API实际地址）：

```powershell
$env:PUBLIC_GAME_API_ORIGIN='https://your-private-game-api.vercel.app'
node scripts/build.mjs
```

当前博客的 `lib/friends-hotel.cjs` 已通过Hexo生成器提供 `friends-hotel/` 前端路由，无需重复复制到 `source/`。未来发布构建时设置 `GAH_PUBLIC_API_ORIGIN` 为专用HTTPS游戏API，再运行博客构建，检查 `public/friends-hotel/config.js` 指向该公开API地址。此变量仅放API来源，不放数据库连接串、密码或令牌。独立项目的 `dist/` 仍可用于单独静态托管。

当前入口按用户要求加入站内搜索，不加入导航、不写公开博文、不进入首页和归档。页面已有noindex元数据。任何使用站内搜索或拿到地址的人都可能下载公开网页代码，只有通过后端访问密码与独立会话才能读取和操作对局。

`lib/`和`api/`作为应用源码保存在仓库的`apps/`中，不会被Hexo发布为网页资源。不要提交`.private/`、`.env`、数据库连接、密码哈希、真实会话、对局存档或重连文件。后端部署时在Vercel选择Root Directory为`apps/grand-austria-hotel`。

博客GitHub Actions从仓库变量`GAH_PUBLIC_API_ORIGIN`读取公开API来源；后端就绪后设置该变量并重新运行Pages工作流即可。此变量只能是无凭据的HTTPS来源，不承载任何秘密。

## 保持iPad跨站登录可用

GitHub Pages与Vercel域名不同。本项目使用Authorization Bearer会话，不依赖第三方Cookie，因此避免依赖Safari允许跨站Cookie。令牌不放URL中；浏览器仅保存自己的玩家会话。生产环境使用HTTPS。

## 后续资料

- [Neon权限](https://neon.com/docs/manage/database-access)
- [Vercel函数](https://vercel.com/docs/functions)
- [Vercel限流](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- [Vercel费用管理](https://vercel.com/docs/spend-management)
- [GitHub Pages静态托管](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

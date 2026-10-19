# 公网联机部署与GitHub发布

用户已授权发布GitHub页面并新建游戏专用Vercel与Neon。2026-10-19已部署API `https://grand-austria-hotel.vercel.app`，使用独立Neon项目`gentle-band-89164349`；原Waline项目`icy-lab-00585924`保持独立。受限LOGIN角色`hotel_game_login`只继承`hotel_player_api`，不具备Neon管理员、建库或建角色权限。实际公网HTTP验收记录见`cloud-acceptance.json`。

公网统一管理员密码按用户指定值配置，仅在Vercel保存scrypt哈希，不写入仓库或静态页面。好友使用四位数字房间码加入对应房间，无需获知管理员密码。原本地存档没有迁移。`.private/`和环境文件明确排除在Git导出、静态构建及Vercel上传之外。以下步骤用于以后维护或重新部署。

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
6. 已通过真实公网API与Neon验证独立玩家登录、建房/加入、完整开局、动作同步、刷新恢复、隐藏手牌、请求去重与并发冲突。实体iPad Safari、两台物理设备及完整七轮公网长局仍需实际试玩，不能用本机浏览器模拟替代。

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

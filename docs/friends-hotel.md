# 从博客搜索进入奥地利大饭店

本地地址：`http://localhost:4000/`。点击搜索，输入“奥地利大饭店”，选择“奥地利大饭店 · 好友联机”，进入密码页。

直接入口：`http://localhost:4000/friends-hotel/`。

本地第一次由房主在电脑页面设置至少9字符的统一管理员密码。管理员进入大厅创建房间；好友选择“房间码加入”，填写昵称和四位数字码即可入座，无需个人密码。密码与邀请码权限由服务端校验，不写在网页JS里。

继续使用原来的`start-admin.bat`或`run-hexo-server.bat`启动博客即可，游戏接口随Hexo一起加载，不需要单独启动游戏。现有博客运行时，首次安装集成后需重启一次Hexo服务。

入口只加入站内搜索，不创建公开文章，不加入首页、归档、分类或导航。用户已授权上传源码和页面。线上GitHub Pages在配置公网游戏API前显示“公网联机尚未启用”；本地模式继续正常登录试玩。

## 文件

- `scripts/friends-hotel.js`：注册Hexo集成。
- `lib/friends-hotel.cjs`：公开资源生成、搜索条目追加、本地中间件加载。
- `test/friends-hotel.test.cjs`：搜索保留/去重、子目录、公开资源边界和API地址验证。
- 游戏项目：仓库内`apps/grand-austria-hotel/`，可独立构建或供Vercel使用。本机已有`Documents/ChatGPT/CRworld/work/grand-austria-hotel`时继续使用它，保留现有本地密码及存档；`GAH_PROJECT_DIR`可覆盖目录。

游戏服务在`/friends-hotel/api/`，与原博客页面、Hexo Pro、特效管理和Waline使用各自路径。游戏接口不读取Waline或博客的数据库连接。游戏的本地密码哈希/会话/对局保存在游戏项目`.private/blog-state.json`，不进入博客静态目录或Git。

独立4173试玩使用另一份`.private/local-state.json`，密码和房间不自动合并。不要将任何`.private/`文件复制到博客。

## 之后发布

公网联机需要配置专用Vercel/Neon游戏API，并设置仓库变量`GAH_PUBLIC_API_ORIGIN=https://实际游戏API域名`，重新运行Pages工作流。只允许无凭据的HTTPS来源。未配置时，静态GitHub Pages展示待开门页。

当前Hexo仍只监听电脑本机，不自动开放博客管理后台。iPad同Wi-Fi试玩可使用游戏项目的独立局域网启动器；不要把Hexo Pro后台端口直接开放给好友。

验证命令：`node --test test/friends-hotel.test.cjs`，以及`node node_modules/hexo/bin/hexo generate`。

## 单人画面测试与新版美术

登录后在大厅点“单人画面测试”，或访问`http://localhost:4000/friends-hotel/?preview=1`。保留原来的访问密码要求，不需要第二位玩家。示例采用一人控制两席的方式，可以切换场景、日夜版面和视角，默认自动跟随回合；取骰、上菜、入住和计分复用同一套纯规则引擎。

示例仅存在页面内存中，不调用好友房间的写接口；退出会保留登录身份，刷新或重置恢复示例。美术已改为维也纳复古饭店风格：原创饭店与四类客人插画、窗框立面棋盘、纸质卡牌和黄铜/深绿控件。源素材与完整提示词保存在游戏项目`docs/ART_DIRECTION.md`。

Hexo公开资源白名单现包含前端模块、浏览器示例规则包及两张原创PNG。认证、数据库、真实会话和对局文件不在其中。原多人游戏仍由服务端验证，浏览器示例不会改变联机权限。

右下角可切换全屏；不支持原生全屏的浏览器自动使用沉浸布局并提示地址栏限制。手机已检查320/360/390竖屏、844横屏与768平板宽度；这属于浏览器尺寸模拟，实体iOS Safari还需设备验收。

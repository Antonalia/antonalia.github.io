# 维也纳饭店美术方向

风格：1900年前后的维也纳，暖石材、深绿木作、黄铜、象牙色纸张、低饱和的酒红/蓝/赭黄/绿。标题采用系统衬线字体，无外站字体依赖。原色块房间改成有编号、百叶窗、开窗暖光和入住人影的立面；状态与颜色仍保留文字标记。

## 最终素材与来源

本次使用**内置imagegen**，未使用CLI/API密钥路径。生成图原件已复制进项目，前端不依赖用户目录中的生成缓存。

- `public/assets/hotel-vienna.png`：1536×1024，饭店外观，用于登录入口。
- `public/assets/guest-portraits.png`：2172×724，四等分肖像图集，使用CSS按颜色显示对应部分。四类代表肖像共用；每张客人牌自己的姓名、需求、分数和奖励保持独立。
- `public/visuals.mjs`：自行绘制的SVG骰子、咖啡/酒/甜点、皇冠、钥匙与服务铃。

未使用原作卡图或Yucata游戏美术。两张插画未经语义修改，使用CSS排版、遮罩和背景定位。生成PNG原件均保留。

## 饭店插画提示词（原文）

Create original production illustration for a private browser board game set in a grand Viennese hotel around 1900. Wide landscape composition approximately 3:2. Elegant hand painted gouache and fine engraved linework, richly detailed yet restrained European illustrated board game art. Scene: a welcoming Vienna hotel corner facade at dusk, cream stone architecture, tall arched windows glowing amber, a burgundy striped awning, two potted palms at a brass-framed entrance, subtle café table, distant domes and tram cables. The building sits mostly on the right two thirds; left side has softly atmospheric dark umber and olive evening street, providing quiet space for overlaid UI text. Cream, tobacco brown, oxblood, muted teal, antique gold palette. Warm, nostalgic, quietly luxurious, detailed painterly texture, no photorealism, no fantasy palace, no casino aesthetic. No text, no lettering, no logos, no watermark, no border, no game components, no UI. This is original artwork, do not imitate the art of any existing board game.

## 客人肖像提示词（原文）

Original illustration asset atlas for a turn-of-the-century Viennese hotel board game UI. A single wide landscape image, desired aspect ratio 3:1, containing exactly FOUR ADJACENT EQUAL-WIDTH VERTICAL PORTRAIT PANELS in one horizontal row, edge to edge without gutters or dividing frames. Each panel shows one centered head-and-shoulders character, with face around upper-middle height and shoulders filling bottom. From LEFT to RIGHT: (1) a cheerful young violinist gentleman, mustard brown waistcoat and bow tie, ochre background; (2) an elegant aristocratic lady with an elaborate dark hat and pearl necklace, teal blue background; (3) an older distinguished bespectacled scholar with groomed moustache and burgundy jacket, muted brick red background; (4) a traveling woman with a green Edwardian jacket and understated hat, sage green background. All four characters welcoming and individually recognizable, elegant expressive faces. Style: refined hand-painted gouache with delicate old print linework, antique European illustrated game cards, sophisticated warm cream highlights, muted deep shadows, aged paper texture, consistent lighting and painted detail. No text, no numbers, no symbols, no logos, no watermarks, no UI, no card border. Do not reproduce existing game artwork. Keep each face safely centered in its own quarter so panels can be cropped individually with CSS.

## 界面验证

截图保存在本目录：`vienna-arrival.jpg`、`vienna-board.jpg`、`vienna-cards.jpg`。单人示例覆盖营业中、新局开场和终局；棋盘适配iPad横竖屏，小屏提供“饭店棋盘 / 客人市场 / 本回合操作”跳转栏。

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

早期截图保存在本目录：`vienna-arrival.jpg`、`vienna-board.jpg`、`vienna-cards.jpg`。当前操作台已改为固定一屏，卡片分页，底部切换游戏区域。

## 2026-10-18 本地美术改进

继续使用**内置 imagegen**生成原创图集，未使用CLI或外部API密钥。原件均复制到项目内，原有四人图集保留。

- `public/assets/guest-portraits-v2.png`：4列×3行，共十二种客人代表肖像；56张客人牌按角色及颜色复用，姓名与规则各自独立。
- `public/assets/staff-portraits.png`：4列×2行，共八类员工肖像；48张员工牌按岗位复用。
- `public/card-art.mjs`：角色与图集的映射、已满足需求的勾选标记、所有玩家的公开资源和目标图像。
- `public/polish.css`：饱和蓝/红/黄房门、锁/空床/住客状态、放大画像、紧凑文字和横竖屏布局。
- `public/visuals.mjs`：本地彩色SVG食物、纸币/金币、金星与皇冠；没有远程图标依赖。

两张新图集未经语义修改，用SVG视窗等比裁切，避免手机竖卡与平板宽卡拉伸人像。用户截图仅用来理解交互和信息层级，没有复制其商业卡图。本轮仅保存本地，未上传。

后续修正：客人图集的实际行分界为0/360/717/1086，员工图集为0/443/887，不能按完全等高的行裁切。现在按实际像素边界向内留3像素，消除相邻肖像露出的细条。同排客人、员工卡用共享网格行对齐图片底边与正文起始位置；短横屏继续使用左右分栏。

客人卡现增加画像上方独立费用/分数顶栏，使用本地SVG金币与星标；食物两列排列，奖励逐条分行。客人卡共用顶栏、画像、正文三条网格行，继续保持同排对齐；员工卡保留两条共享行。最新效果见`card-header-guests.jpg`及`card-header-mobile.jpg`。

咖啡厅进一步固定为三个席位，空席保留浅色虚线卡框和席号。已迎接客人的画像改为完整等比展示；内层SVG先隔离图集中的单个肖像，外层按可用空间完整缩放，避免裁掉脸或露出邻图。手机竖屏使用方形画像区。当前咖啡厅效果见`cafe-three-seats.jpg`和`cafe-three-seats-mobile.jpg`。

### 十二客人图集完整提示词

Use case: historical-scene. Create an original production portrait atlas for a browser board game about a Viennese hotel circa 1900. EXACTLY twelve equal square cells in a strict 4-column by 3-row grid, edge-to-edge, no gutters, no frames. Canvas 4:3 landscape. Each cell contains one distinct centered head-and-shoulders person, face centered inside that cell and safely inset. Hand-painted gouache, delicate engraved print linework, warm cream highlights, expressive faces and dark accents, sophisticated European illustrated game art. COLUMN backgrounds, same in each row: ochre yellow, rich teal blue, brick red, sage green. Row 1 left to right: young male violinist in waistcoat; elegant aristocratic woman with large hat; elderly bespectacled male scholar with moustache; young traveling woman in green jacket. Row 2: female opera singer with dark hair and jewel brooch; middle aged male noble with blue coat and neat beard; stern middle aged female doctor with round glasses; cheerful male traveler in brown hat. Row 3: silver-haired female architect in ochre suit; young clean-shaven prince with blue cravat; red-haired male army officer in red uniform; older woman explorer with green hat. All characters visibly different ages and silhouettes. Painterly period clothing, no modern objects. NO text, NO letters, NO numbers, NO watermark, NO UI. Original artwork, do not reproduce existing commercial game illustrations. This is a single atlas asset that will be sliced by CSS into twelve portraits.

### 八员工图集完整提示词

Use case: historical-scene. Create one original production portrait atlas for a browser board game about a grand Viennese hotel circa 1900. EXACTLY eight equal square cells in a strict 4-column by 2-row grid, edge-to-edge, no gutters and no frames. Canvas 2:1 landscape. Each square contains one centered head-and-shoulders hotel employee; face centered and safely inset, shoulders in lower third. Hand-painted gouache with fine antique print linework, expressive human faces, warm cream, dark green, brass, ochre and muted burgundy palette, refined European illustrated game artwork matching a vintage hotel. Row 1 left to right: young male bellhop in burgundy uniform and pillbox cap; middle aged female housekeeper in dark uniform with white collar and apron; cheerful older male chef with white toque and white coat; young female cafe waiter in cream blouse, dark waistcoat and bow tie. Row 2 left to right: older male concierge with neat moustache in deep green frock coat; red-haired female florist with a small flower pinned to her green dress; bespectacled female hotel secretary in a tailored Edwardian blouse; dark-haired male sommelier with a burgundy bow tie. The eight portraits must be clearly distinct with consistent painted lighting. Each cell has a softly textured warm paper background differentiated slightly in hue. NO text, NO letters, NO numbers, NO logos, NO watermarks, NO UI, no props extending across cell boundaries. Original artwork, not copies of any commercial board game. This is one atlas asset to be cropped with CSS.

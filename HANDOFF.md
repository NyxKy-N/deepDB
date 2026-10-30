# deepDB 交接文档（给下一个 AI / 开发者）

> 最后更新：2026-10 ｜ 当前版本：**v1.5.20** ｜ 仓库：`C:\Users\kevin\Desktop\deepDB`
>
> 先读这一页再动代码。本项目没有构建步骤、没有测试框架、没有依赖管理；所有改动都应保持“纯静态、双击 `index.html` 就能用”。

---

## 1. 项目是什么

deepDB 是一个**纯静态的数据库设计教学工具站**，灵感来自 <https://designerdb.io/#tools>。它把“画 ER 模型 → 检查 → 重构成关系模式”的流程全部放在浏览器里完成，不联网、不上传数据，模型保存在 `localStorage`。

包含 4 个工具 + 首页/About：

| 路由 | 工具 | 作用 |
| --- | --- | --- |
| `#/` | Home | 首页（用户的作品展示 + 工具入口） |
| `#/tools/er` | designER | ER 模型设计：实体/关系/属性/ISA，自动检查、重构、导出 JSON |
| `#/tools/translater` | translatER | ER 模型 → 关系模式文本（表/PK/FK/说明），可导入 `designER` 的 `.er` 文件 |
| `#/tools/noer` | noER | 文档数据库建模：集合/字段/嵌套/引用，输出 JSON Schema、MongoDB 校验器、Mongoose |
| `#/tools/ra` | designQT basic | 关系代数表达式树，推断输出字段并导出表达式 |
| `#/about` | About | 作者、项目说明 |

界面语言：中文 / English / Italiano（默认 **English**）。主题：**仅浅色**（深色模式已在 v1.5.6 移除，若重新引入需要补全所有组件，不要只改 `data-theme`）。支持 7 种强调色（accent），只影响按钮/链接/高亮，不改变页面底色。

---

## 2. 快速开始

```text
C:\Users\kevin\Desktop\deepDB
├─ index.html
├─ README.md
├─ HANDOFF.md          ← 本文件
└─ assets/
   ├─ css/
   │  ├─ style.css          # 基础样式 + 4 个工具的工作区样式（主要文件，很大）
   │  ├─ editorial-ui.css   # 新设计层：胶囊按钮/圆角/毛玻璃/动画/响应式覆盖（按版本在文件末尾追加）
   │  └─ home-alt.css       # 首页（ALT.SHIFT 风格）专用
   ├─ img/                  # 头像、图片素材
   └─ js/
      ├─ boot.js            # 入口：强调色表、applyAccent、主题色、favicon、DDB_BOOT
      ├─ core.js            # window.DDB：util / ui / store / draft / io / history / registerTool
      ├─ i18n-dict.js       # 三语词典（生成体 + 末尾手工 patch）
      ├─ i18n.js            # 词典应用引擎（精确匹配、片段替换、MutationObserver）
      ├─ app.js             # 路由、懒加载、Header/Menu/File、QuickBar、面板开关、设置弹窗
      ├─ home-alt.js        # 首页：滚动叙事、键帽物理、浮层/菜单
      ├─ er-schema.js       # ER 检查 & 重构（window.ERSCHEMA）
      ├─ er.js              # designER：模型/画布/属性球/连线/菜单/面板（约 3070 行）
      ├─ noer.js            # noER
      ├─ ra.js              # designQT basic
      └─ translater.js      # translatER
```

- 打开方式：直接双击 `index.html`（`file://`）即可；不要引入 npm/vite/webpack。
- 唯一的“构建”风险：Windows PowerShell 5.1 下不要用 `Get-Content`/`Set-Content` 回写 UTF-8 源码（会破坏中文/意大利语字符）。改源码用编辑器/Node `fs`；追加 CSS 可以用 `Add-Content -Encoding UTF8`。
- 语法检查（唯一自动化检查）：`node --check assets/js/<file>.js`，全部 JS 都要过。
- 当前 Git：分支 main（v1.5.20），远程 https://github.com/NyxKy-N/deepDB.git。
- 桌面壳：`desktop/`（Electron 便携 exe，见 `desktop/README.md`）。无边框窗口的界面 chrome 在 `desktop/preload.js` + `desktop/desktop.css`（`prepare:web` 负责把 css 拷进 `web/`）；最大化状态按窗口几何与 `screen.avail*` 判断，不依赖 `win.isMaximized()`；图标源文件是 `desktop/build/icon.png`（白底黑字 N&K），网站 favicon 由 `assets/js/boot.js` 动态生成同款。

---

## 3. 运行时架构

### 3.1 `boot.js`（最先加载）

- `ACCENTS`：7 个强调色定义（id、UI 文案、主色、ink 色等）。
- `applyAccent(id)`：写 `html[data-accent]`、CSS 变量 `--accent` / `--accent-ink`、`meta[name=theme-color]`、favicon；同时持久化到 `localStorage`。
- 存储键定义在 `core.js` 的 `KEYS`：`designerdb:v1:` 前缀。
- 暴露 `window.DDB_BOOT`，其它脚本通过它读语言/强调色。

### 3.2 `core.js`（公共层，`window.DDB`）

- `util`：`uid / esc / clone / clamp / fmtTime / fmtAgo / ident / lowerFirst / uniqueName / closest / inField` 等。
- `ui`：`toast / confirm / prompt / modal / popFrom`。
  - `ui.popFrom(el, anchor, mode, done, opts)` 是**二级菜单统一动画**：以 `anchor` 元素或坐标为中心，从 `scale` 放大/缩回；默认 `{scale:.86, shift:.55, open:240, close:200}`，`prefers-reduced-motion` 时 100ms；用 WAAPI，动画会取消上一次 `_popAnim`。
  - 弹窗会记录触发按钮，用于“从按钮长出来”的动画。
- `store`：`key(kind,name)`、`save / list / load / remove`；记录格式 `{kind,name,model,savedAt}`，索引 `designerdb:v1:index:<kind>`。
- `draft`：`key(kind)`、`save / load / clear`，自动草稿键 `designerdb:v1:draft:<kind>`。
- `io`：`download(filename,text,mime)`（优先 `showSaveFilePicker`，用户取消保持静默；失败回退 `<a download>`）、`pickFile(accept)`、`copy(text)`。
- `createHistory({get,set,limit=60,onChange})`：`push/undo/redo/reset/canUndo/canRedo`。
- `registerTool(id, def)`：注册到 `DDB.tools[id]`，四工具脚本末尾都会调用。

### 3.3 `app.js`（路由与外壳）

- `ROUTES`（`app.js:17-25`）：
  - `''` → home，脚本 `assets/js/home-alt.js`，标题 `deepDB · Database design teaching tools`
  - `tools/er` → `er-schema.js` + `er.js`
  - `tools/noer` → `noer.js`
  - `tools/ra` → `ra.js`
  - `tools/translater` → `er-schema.js` + `er.js` + `translater.js`
  - `about` → 无脚本
- `loadScript(src)` 缓存 Promise，`ensureRoute(route)` 串行加载路由脚本，`routeReady(route)` 检测 `window.DDB_HOMEALT`（home）或 `DDB.tools[route.key]`（工具）。
- `cache` 缓存每个路由的 `.view-tool` DOM；`showTool(route)` 首次创建容器并 `tool.mount(box,{mode:'full'})`，之后 `decorateTool(box)`；切路由加 `.is-enter` 动画、滚动到顶部、派发 `resize`。
- `renderNow()`：设 `body[data-route]`、关闭抽屉、设置 `title`/nav active、清空 `#view`、根据 key 调 `showHome/showAbout/showTool`，再 `ensureHeaderMenu / bindMenuTriggers / syncMeta`。
- `hashchange` → `render()`；默认补 `#/`。
- Header / Menu：
  - 桌面：`.dd-nav-pill` 胶囊直接展开工具链接 + Settings/About/Menu。
  - ≤900：点 Menu 打开 `.dd-menu` 抽屉（工具链接、Settings、About），body 加 `dd-menu-open`。
  - File 菜单：`.dd-file-menu`，打开时父级加 `.is-open`；弹出层为 `File` 按钮下方的 `.dd-file-pop`，用 WAAPI 缩放/淡入淡出；点外部/移出关闭。
- 工具装饰：`decorateTool` 会加手机快捷条 `.m-quick`、左右侧边开关 `.side-toggles`、抽屉拖拽把手 `.sheet-grip`、左栏宽度拖拽 `.lb-resize`。这些是 CSS/JS 共同作用的，改结构要同时检查。

### 3.4 工具挂载约定

每个工具脚本 `DDB.registerTool(id,{title,mount})`，`mount(root, ctx)` 自己渲染 DOM、维护状态、绑事件。路由切换不会销毁旧容器（缓存在 `cache`），但 `body[data-route]`/CSS 按当前路由生效。新增工具时：

1. 在 `ROUTES` 加路由和 `scripts`；
2. 新脚本里注册 `DDB.registerTool`；
3. 在 `index.html` 不需要额外 `<script>`（懒加载）；
4. 补 i18n 文案和响应式 CSS。

---

## 4. 数据模型（改模型前必读）

### 4.1 designER（`er.js`）

```js
{
  version: 1, name,
  entities: [{
    id, name, x, y, weak?: bool,
    attributes: [{ id, name, type, key?: true, children?: [...] }]
  }],
  relationships: [{
    id, name, x, y,
    participants: [{ entityId, min, max, role? }],
    attributes: [{ id, name, type }]
  }],
  isas: [{
    id, parentId, childIds: [entityId],
    totality: 't'|'p', exclusivity: 'e'|'o'
  }]
}
```

- 属性：主键 `key:true`；复合键=多个 key 属性；外键存在实体上 `fks:[{attrId,refEntityId,refAttrId,relId}]`（由参与关系推导/手动添加）。
- 弱实体：由 owner 实体 + 部分键组成；`.er` 导入时 `participation._externalIdentifier` 会标记弱实体并继承 owner 主键。
- `.er` 文件导入：`adaptModel` 识别 `{items}` → `convertItemsModel(src,raw)` 转换；实体/关系/参与/属性都按 items 模型映射，支持外部标识符（弱实体）。
- `er-schema.js`：`window.ERSCHEMA = {checks, build, inferType, guessType}`；检查结果分错误/提示，重构会生成表、主键、外键和 notes/warnings。**FK 可以作为主键**：只有外键、没有自有键的实体会生成 `_fkPk` 逻辑（跳过代理 `id`），检查里只作 info；不要把它改回 error。
- 自动布局：`autoLayout()` 用关系/ISA 邻接 BFS 分层（左→右列），关系放在参与者之间的间隙列，避免实体/关系盒重叠；复杂图仍可能连线穿过无关元素（已知限制，`drawRelationLink` 有曲线绕障尝试但不保证）。

### 4.2 noER（`noer.js`）

```js
{
  version: 1, name,
  collections: [{
    id, name, x, y,
    fields: [{
      id, name, type, required?, unique?, key?,
      ref?: { collectionId, fieldId },   // 引用
      children?: [...], itemType?: string
    }]
  }]
}
```

- 字段类型是文本（`string`/`number`/`object`/`array<...>` 等），引用用 `ref`。
- 检查：命名、引用完整性、嵌套结构；输出 JSON Schema / MongoDB validator / Mongoose。

### 4.3 designQT（`ra.js`）

```js
{
  version: 1, name,
  root: {
    id, kind, name,
    pred?, cols?, cond?, groupBy?, aggs?,
    children: [],
    ox, oy
  }
}
```

- 节点种类包括 relation / project / select / rename / join / product / union / intersection / difference / aggregate / division / slot（占位符）。
- 通过“先点占位符、再点左栏操作”包装节点；生成表达式时递归拼接。

### 4.4 translatER（`translater.js`）

```js
state = {
  model: ERmodel | null,
  tables: [{ name, attrs: [{ name, pk?, fk? }] }],
  issues: [...],        // 校验问题
  checked: bool
}
```

- 保存 `STORE_KIND='er'`（可以在 translatER 里直接打开 designER 保存的模型）。
- 表名与 ER 实体名自动匹配（大小写不敏感）；关系自动展开为 FK；复合键/外键规则与 `er-schema` 保持一致。
- 输出为关系模式文本，可复制/下载；`Done` 触发完整校验。

---

## 5. i18n（三语）与文案约定

- 词典 `assets/js/i18n-dict.js` 结构：`window.DDB_I18N_DICT = {meta, zh, en, it: {texts, attrs}}`。
  - 键是**中文原文**；`zh` 的 value 为自身；`en`/`it` 的 texts/attrs 做翻译。
  - 文件主体标注“自动生成，请勿手工编辑”；**不要改生成区**。新文案请在文件末尾追加 patch IIFE：
    ```js
    (function () {
      const D = window.DDB_I18N_DICT;
      D.zh.texts['新中文'] = '新中文';
      D.en.texts['新中文'] = 'New text';
      D.it.texts['新中文'] = 'Nuovo testo';
    })();
    ```
    部分 patch 也用 `[zh,en,it]` 三元组数组 + 运行时合并。
- 引擎 `i18n.js`：
  - 先精确匹配，再 `patternTranslate`（动态句式）与 `fragReplace`（中文片段，按最长匹配）；
  - 监听的属性：`title/placeholder/aria-label/alt`；
  - 不翻译：`[data-i18n-skip]`、`pre/code/kbd/textarea`、`contenteditable`、用户数据类（`.er-attr-name`、`.er-entity-name`、`.er-rel-title`、`.noer-field .fn` 等）；
  - `MutationObserver` 自动重译动态 DOM；`DDB_I18N.setLang('zh'|'en'|'it')` 会写 localStorage、设 `html.lang`、广播 `ddb:lang`。
- 工具内动态拼句（例如“删除属性 X?”）要同时改 `i18n.js` 的 PATTERNS，或在业务代码里直接按语言输出；只加词典不会生效。
- 测试语言切换时不要用 `textContent` 里的隐藏 span 判断“漏翻”——页面会同时存在三种语言 span，视觉上只显示一种。

---

## 6. 样式与设计系统

- CSS 加载顺序：`style.css` → `home-alt.css` → `editorial-ui.css`。
- 新视觉改动（胶囊按钮、圆角、毛玻璃、菜单动画、移动端覆盖）主要追加在 **`editorial-ui.css` 末尾**，并带版本注释；不要把旧规则删到影响历史页面。
- 重要覆盖坑：`style.css` 里存在 `html body .tool-canvas .canvas-tools { left:62px!important; bottom:70px!important }` 这类高特异性规则；手机端覆盖必须用同等或更高特异性（见 `editorial-ui.css` 末尾 `html body .tool-canvas .canvas-tools, html body .canvas-tools`）。
- 原有 `!important` 会压过 WAAPI：做菜单动画前确认没有 `transform:none!important` / `opacity:1!important` 挡住 `ui.popFrom`。
- 响应式断点：**1024**（平板：左右栏变抽屉、画布铺满、快捷条出现）、**900**（Header 胶囊/抽屉）、**860**（translatER 单列、部分面板）、**700**（复合键浮层宽度）、**640**（手机：底部抽屉、dock、隐藏部分 legend）、**520/480**（超窄屏 header 精简）。
- 手机端关键类：`.tool-body.lb-collapsed/.rb-collapsed`、`.sheet-expanded`、`.sheet-dragging`、`.m-quick`、`.side-toggles`、`.canvas-tools`、`.cpk-pop`。
- 图标：内联 SVG（`ER_ICONS` 等），不要引外部图标库。
- 无障碍：菜单/弹窗有 `aria-*`、focus-visible；用键盘测试。

---

## 7. 发布流程（当前仓库）

- 远程：`https://github.com/NyxKy-N/deepDB.git`（`origin`）。
- ；1.5.18 桌面打包/代码签名/自动更新；1.5.19 macOS 桌面版+双平台 Release
- 发布步骤（用户明确要求时才做）：
  1. `node --check` 全部 JS；
  2. 手动验收桌面 + 390/900 宽度；
  3. 清理临时脚本/截图（不要提交 `_*.js`、`_*.png`）；
  4. `git add -A && git commit -m "..."`；
  5. `git push origin main`；
  6. `git tag vX.Y.Z && git push origin vX.Y.Z`；
  7. GitHub Release（网页或 API；本机**没有 `gh` CLI**）。
- Git 配置注意：`core.autocrlf=true`，LF 文件可能被转 CRLF；提交前 `git status` 确认只包含预期文件。
- **不要擅自 push/tag/release**：只有在用户明确要求时才能执行；用户可能只要求“改好、别提交”。

---

## 8. 测试与验收（无测试框架）

最低限度：

```powershell
Get-ChildItem assets/js -Filter *.js | ForEach-Object { node --check $_.FullName }
```

手动检查清单：

- 桌面 1440：首页、4 个工具、About、Settings、Header Menu、File 下拉；
- 390 手机：画布/工具栏/左右抽屉/快捷条/侧边开关不重叠、无横向滚动、复合键浮层在视口内；
- 900 平板：抽屉、toast 不压工具栏、dock 不压 zoom/legend；
- 三语切换：中文/English/Italiano 均无漏翻、无布局跳动；
- designER：画实体/关系/属性、连 ISA、检查、重构、保存/打开/导出/导入 `.er`、undo/redo；
- translatER：载入 sample、导入 `.er`、表名匹配、PK/FK、Done 校验、复制/下载；
- noER：示例、嵌套字段、引用、JSON Schema 输出；
- designQT：示例、添加操作、生成表达式；
- 首页：滚动叙事、键帽物理、菜单开合。

如果写临时 CDP 测试脚本：放根目录、用 `_` 前缀，测完删除；不要提交。浏览器用无头 Chrome 时注意 `file://` 与 localStorage 的隔离。

---

## 9. 已知坑 / 注意事项（血泪）

1. **Windows PowerShell 5.1 不要用 `Get-Content`/`Set-Content` 改 UTF-8 源码**：中文/意大利语会变乱码；用编辑器或 Node `fs`。
2. **`!important` 会压过 WAAPI 动画**：二级菜单不显示开合动画时先查 CSS。
3. **i18n 动态句子**不会仅靠词典自动翻译；需要 PATTERNS 或代码层本地化。
4. **`.er` 导入**使用 items 模型，`_externalIdentifier` 表示外部键/弱实体；部分键有启发式推断，改导入逻辑要重跑示例文件。
5. **外键可以作为主键**：`er-schema` 的 `_fkPk` 逻辑是刻意设计，检查项是 info 不是 error。
6. **自动布局**只保证实体/关系盒不重叠，连线仍可能穿过盒子；如要彻底解决需重写 `drawRelationLink` 的正交/绕障。
7. **手机端 docking**：`.canvas-tools` 在 `.tool-canvas` 内，旧规则特异性很高；覆盖时用 `html body .tool-canvas ...`。
8. **主题只有浅色**：`html[data-theme="light"]` 固定；重新加深色需要测试所有工具（历史上深色在 v1.5.6 被移除）。
9. **Toast 在右侧面板打开时**会移开/隐藏；改布局时确认不遮挡按钮。
10. **首页与工具页是两套 CSS/JS**：`home-alt.js` 只管首页；不要在工具页复用它的 `.ah-*` 样式。
11. **路由缓存**：工具 DOM 会被缓存复用，状态清理/重新渲染要显式处理；`body[data-route]` 决定路由级样式。
12. **移动端手势**：抽屉有 pointer drag/展开/收起，改 `touch-action`/`pointerdown` 要回归 390。

---

## 10. 未完成 / 可继续做的事

- 自动布局连线绕障（已知限制）。
- 更多 `designER` 建模示例 / 导入格式兼容性。
- translatER 与 designER 的 schema 规则若有新变更，需要两边同步测试。
- 如果用户要求重新引入深色模式：需要系统性补全，而不是只加一个属性。

---

## 11. 交接检查清单

- [ ] 读 README + 本文件 + `app.js` 的 `ROUTES` / `renderNow`。
- [ ] 确认当前 `git status` 与 latest tag（`git describe --tags --abbrev=0`）。
- [ ] 改任何工具前，先跑一次 `node --check` 基线。
- [ ] 改动后至少验证 1440 + 390（必要时 900）。
- [ ] 不引入构建工具/第三方依赖。
- [ ] 临时脚本/截图 `_*.js`、`_*.png` 不提交。
- [ ] 未得到用户明确指示时：不 commit、不 push、不 tag、不 release。

---

## 12. 绝对不要做的事

- ❌ 引入 npm / Vite / bundler / 框架依赖（项目承诺纯静态、无构建）。
- ❌ 未经允许 push/tag/release。
- ❌ 把模型数据上传到服务器（项目承诺本地存储）。
- ❌ 删除用户数据/清空 localStorage 而不确认。
- ❌ 用 PowerShell `Set-Content` 回写 UTF-8 源码。
- ❌ 只改词典就宣称 i18n 完成（动态句式/新增 DOM 需同步）。

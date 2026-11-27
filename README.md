# 提示词模板 · Prompt Templates

在 CodexHost 的聊天输入框左下角搜索并插入常用提示词，适用于 Codex Desktop 和 CH Web。

![输入框左下角的提示词模板弹窗](assets/composer.png)

## 安装

需要支持 `manifestVersion: 2`、`page`、`widget` 和 `backend` 的 CodexHost。标签筛选已在 CodexHost `0.27.0` 的 Desktop 和 CH Web 环境验证。

从 [GitHub Release](https://github.com/zxd-666/codexhost-prompt-templates/releases/latest) 下载插件 ZIP。

| 客户端 | 导入并启用 | 打开独立页面 |
| --- | --- | --- |
| Codex Desktop | 设置 → 插件 → 导入插件 → 本地 `.zip` → 安装并启用 | 插件卡片的「打开页面」，或设置左侧「插件页面 → 提示词模板」 |
| CH Web | 左侧「插件」→ 插件中心 → 导入插件 → 本地 `.zip` → 上传 ZIP → 安装并启用 | 插件工作区顶部切页栏的「提示词模板」，或插件卡片的「打开页面」 |

安装后回到对话输入框，点击「添加文件」旁边的模板图标。Web 插件中心需要通过启用访问认证的 Host 打开。

如果已通过本地 ZIP 安装旧版，在插件中心卸载旧版后导入新版并启用。codexhost `0.26.1` 的标准卸载会保留模板数据。

## 使用

- **搜索和插入**。结果只显示模板名称，支持按名称、标签或正文搜索。点选模板或按 `Enter` 插入草稿，`↑` `↓` 在列表里移动，按 `Esc` 关闭。已有文字会保留，发送使用宿主原有操作。
- **原地新建**。点击弹窗搜索框右侧的「＋」，填写名称、可选标签和正文。保存后回到模板列表，新模板可以立即选用。从文档或网页复制的正文粘贴进正文框时，会保留原有的分段和换行。
- **列表操作**。鼠标移到某条模板上时整行高亮。每条模板右侧可编辑、插入输入框或直接发送。点击模板标题也会插入输入框。编辑内置模板时可另存为自定义模板。直接发送适用于输入框没有草稿和附件的情况。
- **弹窗标签筛选**。搜索框下方有一排小号标签，点击某个标签只显示该标签下的模板，点「全部」恢复。标签较多时可横向滑动，鼠标滚轮也能左右滚动。每次打开弹窗都从「全部」开始，搜索会在当前标签内进一步筛选。
- **标签筛选**。在管理页点击筛选栏或模板卡片上的标签，可查看该标签下的模板。搜索可以进一步缩小结果，点击「全部模板」清除标签筛选。编辑模板时，可用逗号分隔多个标签。
- **管理和排序**。在管理页点「新建模板」或模板卡片上的编辑图标，在弹窗里填写名称、标签和正文，`⌘ Enter`（Windows 为 `Ctrl + Enter`）保存，`Esc` 取消。名称和正文必填，没填会在对应字段下方提示。删除不再二次确认，删除后顶部提示里有「撤销」，6 秒内点它会把模板放回原来的位置。也可用「显示内置模板」开关隐藏内置模板。拖动模板左侧的六点手柄后松手即可保存顺序，聚焦手柄时也可用上下方向键移动。管理页和输入框弹窗使用同一顺序。在管理页内按 `/` 可直接聚焦搜索框。
- **多端同时编辑**。如果你在编辑时这条模板已在另一端被修改，保存会被拒绝，弹窗顶部会说明情况，草稿保持不变。点「载入最新内容」用最新版本替换草稿，核对后再保存。模板已在另一端删除时，可以改为另存成新模板。
- **Excel 导出和导入**。在管理页点「导出 Excel」，按当前顺序把自定义模板导出为 `.xlsx`，表格含「名称」「标签」「提示词正文」三列，正文保留换行。内置模板不导出。没有自定义模板时导出的文件只有表头，可以直接当导入模板填写。点「导入 Excel」选择 `.xlsx` 文件，插件读取第一个工作表，第一行为表头，需包含名称列和正文列，标签列可选。表头也可写作「标题」「内容」或英文 Name、Tags、Prompt text。导入的模板按表格顺序排在列表最前面。缺名称或正文、超出长度、与已有模板完全相同的行会跳过，并显示导入和跳过的条数。文件不能超过 10 MB，单次最多 1000 条，不支持旧版 `.xls`。
- **双端共享**。连接同一个 CodexHost Host 的 Desktop 和 Web 共享模板。模板保存在该 Host 的插件数据中，共享后端通过 Host 的存储接口读写模板和排序。

![模板管理页按标签筛选](assets/library.png)

## 界面规范

- 管理页是独立整页，按《张张设计规范》产品族底座 1.2（2026-11-25）实现，产品类型为工具型，前缀 `pt-`。底座令牌复制在 `page/style.css` 开头，只挂在 `.pt-root` 上，不写到 `:root`。按张张的决定只做浅色：宿主切到深色时管理页仍保持浅色，并设置 `color-scheme: light`。
- 输入框左下角的挂件和弹窗嵌在宿主界面里，颜色只用宿主的 `--cx-page-*` 变量，图标尺寸（14px、线宽 1.4px）和按钮尺寸对齐宿主工具栏，深浅色跟随宿主。
- 两处图标都是打包进插件的 Lucide 线性图标（`shared/icons.mjs`），不从 CDN 加载。

## 打包

在包含 `manifest.json` 的源码目录运行以下命令。修改清单中的版本号后，使用对应版本的新 ZIP 文件名。ZIP 输出到 `releases/`，该目录不纳入 git。

```sh
version=$(node -p 'require("./manifest.json").version')
mkdir -p releases
zip -rX "releases/prompt-templates-${version}.zip" manifest.json page widget shared assets backend
unzip -t "releases/prompt-templates-${version}.zip"
```

`manifest.json` 位于 ZIP 根。`page/index.mjs` 与 `widget/index.mjs` 分别导出 `mount(root, api)`，各自跨端复用，通过相对导入共享模板逻辑。挂件根据两端原生输入框的 DOM 标记定位，在可编辑的聊天输入框左侧工具组中占位。

## 发布到 GitHub

1. 创建公开仓库，将本目录中的源码、素材、README 和根级 `manifest.json` 提交到默认分支。
2. 在 GitHub 的 **Releases → Draft a new release** 创建与清单版本一致的标签。
3. 上传一个插件 ZIP，并将 `icon.png`、`composer.png`、`library.png` 作为独立附件上传。用户可以下载 ZIP 本地导入，也可以从「导入插件 → GitHub」粘贴公开仓库地址。

功能参考 [dsh-prompt](https://github.com/FeatherHunter/dsh-prompt)。扩展契约见 [codexhost 官方开发规范](https://github.com/BytePioneer-AI/codex-host/blob/main/.agents/skills/codexhost-add-desktop-extension/SKILL.md)。

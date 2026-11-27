import {
  customTemplates, language, newTemplateId, orderedTemplates, templateKey, templateList, templateTags, watchSettings,
} from "../shared/library.mjs";
import { icon } from "../shared/icons.mjs";
import { bindReorder } from "./reorder.mjs";
import { keepLineBreaksOnPaste } from "../shared/paste.mjs";
import { maxWorkbookBytes, readWorkbook, writeWorkbook } from "./xlsx.mjs";

// Copy follows 张张设计规范: buttons start with a verb, errors say what happened and what to do next,
// toasts are one sentence without a full stop, and empty states invite rather than apologize.
const copy = {
  zh: {
    title: "提示词模板", new: "新建模板", export: "导出 Excel", import: "导入 Excel",
    search: "搜索模板", searchPlaceholder: "搜索名称、标签或正文", searchKey: "按 / 键搜索",
    presets: "显示内置模板", tagFilters: "按标签筛选", allTags: "全部", builtin: "内置",
    newTitle: "新建模板", editTitle: "编辑模板", name: "名称", tags: "标签", body: "提示词正文",
    tagHelp: "选填，多个标签用逗号分隔", save: "保存", cancel: "取消", close: "关闭",
    saveHint: "{key} 保存，Esc 取消",
    edit: "编辑「{title}」", remove: "删除「{title}」", move: "调整「{title}」的顺序",
    moveHint: "拖动排序，聚焦后也可以用 ↑ ↓ 键移动",
    requiredName: "请填写名称", requiredBody: "请填写提示词正文",
    loading: "正在读取模板", loadErrorTitle: "模板没能读出来", loadErrorText: "Host 暂时没有响应，稍后点重试。", retry: "重试",
    emptyTitle: "还没有模板", emptyText: "新建第一条模板，之后在对话输入框左下角就能一键插入。",
    noResultTitle: "没有找到“{query}”", noTagResultTitle: "这个标签下没有模板",
    noResultText: "换个关键词，或者清除筛选再试试。", clearFilters: "清除筛选",
    saved: "已保存", created: "已新建模板", deleted: "已删除「{title}」", undo: "撤销", restored: "已恢复「{title}」",
    orderSaved: "顺序已保存", presetsOn: "已显示内置模板", presetsOff: "已隐藏内置模板",
    exported: "已导出 {count} 条自定义模板", imported: "已导入 {added} 条，跳过 {skipped} 条", fileName: "提示词模板",
    writeError: "保存失败，请检查 Host 连接后重试", orderConflict: "列表已在其他端更新，请重新拖动",
    removeConflict: "这条模板已在其他端修改，列表已刷新，请核对后再删除",
    restoreError: "没能恢复，这条模板可能已在其他端重新创建",
    conflict: "这条模板已在其他端修改。请核对后再保存，不会静默覆盖。", loadLatest: "载入最新内容（替换当前草稿）",
    conflictDeleted: "这条模板已在其他端删除。可以把当前内容另存为新模板。", saveAsNew: "改为新建模板",
    importReadError: "无法读取这个文件，请选择 .xlsx 格式的 Excel 文件",
    importHeaderError: "第一行需要包含「名称」和「正文」列，请改好表头后重新导入",
    importEmpty: "表格里没有模板，请填好后再导入", importLimit: "单次最多导入 1,000 条，请拆分文件后再导入",
    importTooLarge: "文件超过 10 MB，请拆分后再导入",
  },
  en: {
    title: "Prompt templates", new: "New template", export: "Export Excel", import: "Import Excel",
    search: "Search templates", searchPlaceholder: "Search names, tags, or text", searchKey: "Press / to search",
    presets: "Show built-in templates", tagFilters: "Filter by tag", allTags: "All", builtin: "Built-in",
    newTitle: "New template", editTitle: "Edit template", name: "Name", tags: "Tags", body: "Prompt text",
    tagHelp: "Optional. Separate multiple tags with commas.", save: "Save", cancel: "Cancel", close: "Close",
    saveHint: "{key} to save, Esc to cancel",
    edit: "Edit “{title}”", remove: "Delete “{title}”", move: "Reorder “{title}”",
    moveHint: "Drag to reorder, or focus and use the ↑ ↓ keys",
    requiredName: "Enter a name", requiredBody: "Enter the prompt text",
    loading: "Loading templates", loadErrorTitle: "Templates did not load", loadErrorText: "The Host is not responding. Try again in a moment.", retry: "Retry",
    emptyTitle: "No templates yet", emptyText: "Create your first template, then insert it from the bottom-left of the chat composer.",
    noResultTitle: "Nothing matches “{query}”", noTagResultTitle: "No templates with this tag",
    noResultText: "Try another keyword, or clear the filters.", clearFilters: "Clear filters",
    saved: "Saved", created: "Template created", deleted: "Deleted “{title}”", undo: "Undo", restored: "Restored “{title}”",
    orderSaved: "Order saved", presetsOn: "Built-in templates shown", presetsOff: "Built-in templates hidden",
    exported: "Exported {count} custom templates", imported: "Imported {added}, skipped {skipped}", fileName: "prompt-templates",
    writeError: "Could not save. Check the Host connection and try again", orderConflict: "The list changed elsewhere. Move the template again",
    removeConflict: "This template changed elsewhere. The list is refreshed, so review it before deleting",
    restoreError: "Could not restore. The template may have been recreated elsewhere",
    conflict: "This template changed elsewhere. Review it before saving. Nothing is overwritten silently.", loadLatest: "Load the latest version (replaces your draft)",
    conflictDeleted: "This template was deleted elsewhere. You can save your draft as a new template.", saveAsNew: "Save as a new template",
    importReadError: "Could not read this file. Choose an .xlsx Excel file",
    importHeaderError: "The first row needs Name and Prompt text columns. Fix the header and import again",
    importEmpty: "The sheet has no templates. Fill it in and import again", importLimit: "Import up to 1,000 templates at a time. Split the file and try again",
    importTooLarge: "The file is larger than 10 MB. Split it and try again",
  },
};

const toastDuration = { success: 3000, error: 5000, undo: 6000 };

const importColumns = {
  title: ["名称", "标题", "name", "title"],
  tags: ["标签", "tags", "tag"],
  body: ["正文", "内容", "提示词正文", "提示词", "prompt text", "prompt", "body", "content"],
};

// Returns { templates, skipped } for valid rows, or a copy key when the sheet cannot be used.
function importedTemplates(rows, existing) {
  const header = (rows[0] ?? []).map((cell) => cell.trim().toLowerCase());
  const column = Object.fromEntries(Object.entries(importColumns)
    .map(([key, names]) => [key, header.findIndex((name) => names.includes(name))]));
  if (column.title < 0 || column.body < 0) return rows.length ? "importHeaderError" : "importEmpty";
  const seen = new Set(existing.map(templateKey));
  const templates = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    if (row.every((cell) => !cell.trim())) continue;
    const title = (row[column.title] ?? "").trim();
    const tags = (row[column.tags] ?? "").trim();
    const body = (row[column.body] ?? "").trim();
    const key = templateKey({ title, tags, body });
    if (!title || !body || title.length > 100 || tags.length > 180 || body.length > 20000 || seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    templates.push({ id: newTemplateId(), title, tags, body });
  }
  return templates.length > 1000 ? "importLimit" : { templates, skipped };
}

const editable = (element) => element?.closest?.("input, textarea, select, [contenteditable]:not([contenteditable=false])");

export function mount(root, api) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const events = new AbortController();
  const listen = (element, type, handler, options = {}) => element.addEventListener(type, handler, { ...options, signal: events.signal });
  const mac = /mac|iphone|ipad/i.test(win.navigator.userAgentData?.platform ?? win.navigator.platform ?? "");
  let settings;
  let loadFailed = false;
  let showSkeleton = false;
  let writing = false;
  let reading = false;
  let activeTag = "";
  let editing;
  let returnFocus;
  let attempted = false;
  let toastTimer = 0;
  const lang = () => language(api.locale);
  const format = (value) => typeof value === "number" ? value.toLocaleString(lang() === "zh" ? "zh-CN" : "en") : value;
  const t = (key, values = {}) => copy[lang()][key].replace(/\{(\w+)\}/g, (match, name) => format(values[name]) ?? match);

  const main = doc.createElement("section");
  main.className = "pt-root";
  main.tabIndex = -1;
  main.innerHTML = `
    <div class="pt-page">
      <header class="pt-head">
        <h1 class="pt-title"></h1>
        <div class="pt-head-actions">
          <button class="pt-btn pt-btn--secondary" type="button" data-export>${icon("download")}<span data-copy="export"></span></button>
          <button class="pt-btn pt-btn--secondary" type="button" data-import>${icon("upload")}<span data-copy="import"></span></button>
          <button class="pt-btn pt-btn--primary" type="button" data-new>${icon("plus")}<span data-copy="new"></span></button>
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden data-import-file>
        </div>
      </header>
      <div class="pt-filters">
        <label class="pt-search">${icon("search")}<input class="pt-input" type="search" autocomplete="off" aria-keyshortcuts="/" data-search><kbd class="pt-kbd" aria-hidden="true">/</kbd></label>
        <button class="pt-switch-row" type="button" role="switch" data-presets><span class="pt-switch" aria-hidden="true"></span><span data-copy="presets"></span></button>
      </div>
      <div class="pt-chips" role="group" hidden></div>
      <div class="pt-results">
        <div class="pt-skeleton" hidden>${'<div class="pt-skeleton-card"><span class="pt-skeleton-bar"></span><span class="pt-skeleton-bar"></span></div>'.repeat(3)}</div>
        <div class="pt-error" hidden>
          <p class="pt-error-title" data-copy="loadErrorTitle"></p>
          <p class="pt-error-text" data-copy="loadErrorText"></p>
          <button class="pt-btn pt-btn--secondary pt-btn--sm" type="button" data-retry data-copy="retry"></button>
        </div>
        <div class="pt-empty" hidden>
          <p class="pt-empty-title"></p>
          <p class="pt-empty-text"></p>
          <button class="pt-btn pt-btn--ghost pt-btn--sm" type="button" data-empty-action></button>
        </div>
        <ul class="pt-list"></ul>
      </div>
    </div>
    <dialog class="pt-dialog" aria-labelledby="pt-dialog-title">
      <form novalidate>
        <div class="pt-dialog-head">
          <h2 class="pt-dialog-title" id="pt-dialog-title"></h2>
          <button class="pt-icon-btn" type="button" data-close>${icon("x")}</button>
        </div>
        <div class="pt-dialog-body">
          <div class="pt-conflict" role="alert" hidden>
            <p></p>
            <button class="pt-btn pt-btn--ghost pt-btn--sm" type="button" data-resolve></button>
          </div>
          <div class="pt-field">
            <label class="pt-label" for="pt-field-title"><span data-copy="name"></span><span class="pt-required" aria-hidden="true">*</span></label>
            <input class="pt-input" id="pt-field-title" name="title" maxlength="100" required autocomplete="off" aria-describedby="pt-error-title">
            <p class="pt-field-error" id="pt-error-title" role="alert"></p>
          </div>
          <div class="pt-field">
            <label class="pt-label" for="pt-field-tags" data-copy="tags"></label>
            <input class="pt-input" id="pt-field-tags" name="tags" maxlength="180" autocomplete="off" aria-describedby="pt-help-tags">
            <p class="pt-help" id="pt-help-tags" data-copy="tagHelp"></p>
          </div>
          <div class="pt-field">
            <label class="pt-label" for="pt-field-body"><span data-copy="body"></span><span class="pt-required" aria-hidden="true">*</span></label>
            <textarea class="pt-input" id="pt-field-body" name="body" rows="8" maxlength="20000" required aria-describedby="pt-error-body"></textarea>
            <p class="pt-field-error" id="pt-error-body" role="alert"></p>
          </div>
        </div>
        <div class="pt-dialog-foot">
          <span class="pt-dialog-hint"></span>
          <button class="pt-btn pt-btn--secondary" type="button" data-cancel data-copy="cancel"></button>
          <button class="pt-btn pt-btn--primary" type="submit" data-save>${icon("loader")}<span data-copy="save"></span></button>
        </div>
      </form>
    </dialog>
    <div class="pt-toast" popover="manual" role="status">
      <span class="pt-toast-icon"></span><span class="pt-toast-text"></span>
      <button class="pt-toast-action" type="button" hidden></button>
    </div>`;
  root.append(main);

  const find = (selector) => main.querySelector(selector);
  const add = find("[data-new]");
  const exportButton = find("[data-export]");
  const importButton = find("[data-import]");
  const importFile = find("[data-import-file]");
  const search = find("[data-search]");
  const presets = find("[data-presets]");
  const chips = find(".pt-chips");
  const results = find(".pt-results");
  const skeleton = find(".pt-skeleton");
  const errorBlock = find(".pt-error");
  const empty = find(".pt-empty");
  const emptyAction = find("[data-empty-action]");
  const list = find(".pt-list");
  const dialog = find(".pt-dialog");
  const form = dialog.querySelector("form");
  const field = (name) => form.elements.namedItem(name);
  const saveButton = find("[data-save]");
  const conflict = find(".pt-conflict");
  const resolve = find("[data-resolve]");
  const toast = find(".pt-toast");
  const toastAction = toast.querySelector(".pt-toast-action");
  const cancelReorder = bindReorder(list, events.signal, moveTemplate);

  // ---------- Toast ----------
  let toastRun;
  let toastMs = 0;
  function hideToast() {
    win.clearTimeout(toastTimer);
    toastTimer = 0;
    toastRun = undefined;
    if (toast.matches(":popover-open")) toast.hidePopover();
  }
  function armToast() {
    win.clearTimeout(toastTimer);
    toastTimer = win.setTimeout(hideToast, toastMs);
  }
  function showToast(message, kind = "success", action) {
    hideToast();
    toast.querySelector(".pt-toast-icon").innerHTML = icon(kind === "error" ? "alert" : "check");
    toast.querySelector(".pt-toast-text").textContent = message;
    toast.setAttribute("role", kind === "error" ? "alert" : "status");
    toastAction.hidden = !action;
    toastAction.textContent = action?.label ?? "";
    toastRun = action?.run;
    toastMs = action ? toastDuration.undo : toastDuration[kind];
    toast.showPopover();
    armToast();
  }
  listen(toastAction, "click", () => {
    const run = toastRun;
    hideToast();
    run?.();
  });
  // Keep the toast up while the pointer or keyboard focus is on it.
  for (const type of ["pointerenter", "focusin"]) listen(toast, type, () => win.clearTimeout(toastTimer));
  for (const type of ["pointerleave", "focusout"]) listen(toast, type, armToast);

  // ---------- Rendering ----------
  function tagButton(className, key, label) {
    const control = doc.createElement("button");
    control.type = "button";
    control.className = className;
    control.dataset.templateTag = key;
    control.title = label;
    control.setAttribute("aria-pressed", String(key === activeTag));
    if (className === "pt-tag") {
      const text = doc.createElement("span");
      text.textContent = label;
      control.append(text);
    } else {
      control.textContent = label;
    }
    return control;
  }

  function renderChips() {
    const tags = new Map();
    for (const template of settings ? templateList(settings, api.locale) : []) {
      for (const { key, label } of templateTags(template.tags)) if (!tags.has(key)) tags.set(key, label);
    }
    if (!tags.has(activeTag)) activeTag = "";
    const focused = chips.querySelector("button:focus")?.dataset.templateTag;
    chips.hidden = !tags.size;
    chips.setAttribute("aria-label", t("tagFilters"));
    const sorted = [...tags].sort((a, b) => a[1].localeCompare(b[1], lang()));
    const controls = tags.size
      ? [tagButton("pt-chip", "", t("allTags")), ...sorted.map(([key, label]) => tagButton("pt-chip", key, label))]
      : [];
    chips.replaceChildren(...controls);
    if (focused !== undefined) (controls.find((control) => control.dataset.templateTag === focused) ?? controls[0])?.focus();
  }

  function iconButton(name, label, className = "") {
    const control = doc.createElement("button");
    control.type = "button";
    control.className = `pt-icon-btn ${className}`.trim();
    control.innerHTML = icon(name);
    control.title = label;
    control.setAttribute("aria-label", label);
    return control;
  }

  function templateRow(template, count) {
    const row = doc.createElement("li");
    row.className = "pt-card";
    row.dataset.templateId = template.id;

    const handle = doc.createElement("button");
    handle.type = "button";
    handle.className = "pt-drag";
    handle.innerHTML = icon("grip");
    handle.dataset.reorderHandle = "";
    handle.disabled = writing || count < 2;
    handle.title = t("moveHint");
    handle.setAttribute("aria-label", t("move", { title: template.title }));
    handle.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown");

    const text = doc.createElement("div");
    text.className = "pt-card-main";
    const head = doc.createElement("div");
    head.className = "pt-card-head";
    const title = doc.createElement("h2");
    title.className = "pt-card-title";
    title.textContent = template.title;
    title.title = template.title;
    head.append(title);
    if (template.preset) {
      const builtin = doc.createElement("span");
      builtin.className = "pt-tag pt-tag--static";
      builtin.textContent = t("builtin");
      head.append(builtin);
    }
    text.append(head);
    const tags = templateTags(template.tags);
    if (tags.length) {
      const meta = doc.createElement("div");
      meta.className = "pt-card-tags";
      meta.append(...tags.map(({ key, label }) => tagButton("pt-tag", key, label)));
      text.append(meta);
    }
    const preview = doc.createElement("p");
    preview.className = "pt-card-body";
    preview.textContent = template.body;
    text.append(preview);
    row.append(handle, text);

    if (!template.preset) {
      const actions = doc.createElement("div");
      actions.className = "pt-card-actions";
      const edit = iconButton("pencil", t("edit", { title: template.title }));
      edit.dataset.edit = "";
      const remove = iconButton("trash", t("remove", { title: template.title }), "pt-icon-btn--danger");
      remove.dataset.remove = "";
      actions.append(edit, remove);
      row.append(actions);
    }
    return row;
  }

  // Which control inside a row had focus, so it can get focus back after the row is rebuilt.
  function focusedControl() {
    const focused = list.querySelector(":focus");
    const id = focused?.closest("li")?.dataset.templateId;
    if (!id) return undefined;
    if (focused.matches("[data-reorder-handle]")) return { id, selector: "[data-reorder-handle]:enabled" };
    if (focused.matches("[data-edit]")) return { id, selector: "[data-edit]" };
    if (focused.matches("[data-remove]")) return { id, selector: "[data-remove]" };
    if (focused.matches("[data-template-tag]")) return { id, selector: `[data-template-tag="${CSS.escape(focused.dataset.templateTag)}"]` };
    return undefined;
  }

  function focusRow(id, selector) {
    const row = [...list.children].find((item) => item.dataset.templateId === id);
    const target = row?.querySelector(selector);
    target?.focus();
    return Boolean(target);
  }

  function renderList() {
    const focused = focusedControl();
    cancelReorder();
    const ready = Boolean(settings);
    skeleton.hidden = ready || loadFailed || !showSkeleton;
    errorBlock.hidden = ready || !loadFailed;
    results.setAttribute("aria-busy", String(!ready && !loadFailed));
    if (ready) results.removeAttribute("aria-label");
    else results.setAttribute("aria-label", t("loading"));
    if (!ready) {
      empty.hidden = true;
      list.replaceChildren();
      return;
    }
    const query = search.value.trim();
    const templates = templateList(settings, api.locale, search.value, activeTag);
    empty.hidden = templates.length > 0;
    if (!templates.length) {
      const filtered = Boolean(query || activeTag);
      find(".pt-empty-title").textContent = !filtered ? t("emptyTitle")
        : query ? t("noResultTitle", { query }) : t("noTagResultTitle");
      find(".pt-empty-text").textContent = filtered ? t("noResultText") : t("emptyText");
      emptyAction.textContent = filtered ? t("clearFilters") : t("new");
      emptyAction.dataset.action = filtered ? "clear" : "new";
    }
    list.replaceChildren(...templates.map((template) => templateRow(template, templates.length)));
    if (focused) focusRow(focused.id, focused.selector);
  }

  function render() {
    main.lang = lang() === "zh" ? "zh-CN" : "en";
    find(".pt-title").textContent = t("title");
    for (const element of main.querySelectorAll("[data-copy]")) element.textContent = t(element.dataset.copy);
    search.placeholder = t("searchPlaceholder");
    search.setAttribute("aria-label", t("search"));
    search.title = t("searchKey");
    find(".pt-kbd").title = t("searchKey");
    const ready = Boolean(settings);
    add.disabled = !ready;
    exportButton.disabled = !ready || reading;
    importButton.disabled = !ready;
    importButton.setAttribute("aria-busy", String(reading));
    importButton.querySelector(".pt-svg").outerHTML = icon(reading ? "loader" : "upload");
    presets.disabled = !ready;
    if (presets.dataset.pending === undefined) presets.setAttribute("aria-checked", String(settings?.showPresets !== false));
    const close = find("[data-close]");
    close.title = t("close");
    close.setAttribute("aria-label", t("close"));
    find(".pt-dialog-title").textContent = t(editing ? "editTitle" : "newTitle");
    find(".pt-dialog-hint").textContent = t("saveHint", { key: mac ? "⌘ Enter" : "Ctrl + Enter" });
    renderChips();
    renderList();
  }

  // ---------- Writes ----------
  // Runs one backend change. Returns the backend result, or undefined when the request failed.
  async function write(change) {
    if (writing || !settings) return undefined;
    writing = true;
    renderList();
    try {
      const result = await api.backend.invoke("changeLibrary", change);
      if (result) settings = await api.storage.get().catch(() => settings);
      return result;
    } catch {
      if (!api.signal.aborted) showToast(t("writeError"), "error");
      return undefined;
    } finally {
      writing = false;
      if (!api.signal.aborted) render();
    }
  }

  async function removeTemplate(template) {
    const index = orderedTemplates(settings, api.locale).findIndex(({ id }) => id === template.id);
    const rows = [...list.children];
    const position = rows.findIndex((row) => row.dataset.templateId === template.id);
    const neighbor = (rows[position + 1] ?? rows[position - 1])?.dataset.templateId;
    const result = await write({ action: "remove", previous: template });
    if (api.signal.aborted || result === undefined) return;
    if (!result) {
      showToast(t("removeConflict"), "error");
      return;
    }
    // The focused delete button is gone, so move focus to the next template instead of losing it.
    if (!main.querySelector(":focus") && !(neighbor && focusRow(neighbor, "[data-edit], [data-reorder-handle]:enabled"))) search.focus();
    showToast(t("deleted", { title: template.title }), "success", {
      label: t("undo"),
      run: () => void restoreTemplate(template, Math.max(0, index)),
    });
  }

  async function restoreTemplate(template, index) {
    const { id, title, tags, body } = template;
    const result = await write({ action: "restore", template: { id, title, tags, body }, index });
    if (api.signal.aborted || result === undefined) return;
    showToast(result ? t("restored", { title }) : t("restoreError"), result ? "success" : "error");
  }

  async function moveTemplate(move, keyboard) {
    const result = await write({ action: "reorder", ...move, query: search.value, tag: activeTag, locale: api.locale });
    if (api.signal.aborted || result === undefined) return;
    showToast(t(result ? "orderSaved" : "orderConflict"), result ? "success" : "error");
    if (keyboard) focusRow(move.fromId, "[data-reorder-handle]:enabled");
  }

  async function togglePresets() {
    if (presets.dataset.pending !== undefined) return;
    const next = presets.getAttribute("aria-checked") !== "true";
    presets.dataset.pending = "";
    presets.setAttribute("aria-checked", String(next));
    const result = await write({ action: "presets", showPresets: next });
    delete presets.dataset.pending;
    if (api.signal.aborted) return;
    render();
    if (result) showToast(t(next ? "presetsOn" : "presetsOff"));
  }

  // ---------- Dialog ----------
  function fieldError(name, key) {
    const input = field(name);
    const message = find(`#pt-error-${name}`);
    input.setAttribute("aria-invalid", String(Boolean(key)));
    message.innerHTML = key ? icon("alert") : "";
    if (key) message.append(t(key));
  }

  function validate(name) {
    const required = { title: "requiredName", body: "requiredBody" }[name];
    const valid = field(name).value.trim().length > 0;
    fieldError(name, valid ? "" : required);
    return valid;
  }

  function setConflict(kind) {
    conflict.hidden = !kind;
    conflict.dataset.kind = kind ?? "";
    if (!kind) return;
    conflict.querySelector("p").textContent = t(kind === "deleted" ? "conflictDeleted" : "conflict");
    resolve.textContent = t(kind === "deleted" ? "saveAsNew" : "loadLatest");
  }

  function fill(template) {
    field("title").value = template?.title ?? "";
    field("tags").value = template?.tags ?? "";
    field("body").value = template?.body ?? "";
  }

  function openDialog(template, opener) {
    if (dialog.open) return;
    editing = template;
    returnFocus = opener;
    attempted = false;
    fill(template);
    fieldError("title", "");
    fieldError("body", "");
    setConflict(undefined);
    render();
    dialog.showModal();
    field("title").focus();
  }

  function closeDialog() {
    if (writing || !dialog.open) return;
    dialog.close();
    // The opener may have been re-rendered while the dialog was open; fall back to the same row's edit button.
    const fallback = returnFocus?.matches("[data-edit]") && returnFocus.closest("li")?.dataset.templateId;
    if (!returnFocus?.isConnected && !(fallback && focusRow(fallback, "[data-edit]"))) search.focus();
    else if (returnFocus?.isConnected) returnFocus.focus();
    returnFocus = undefined;
  }

  async function submit() {
    if (writing) return;
    attempted = true;
    const invalid = ["title", "body"].filter((name) => !validate(name));
    if (invalid.length) {
      field(invalid[0]).focus();
      return;
    }
    const previous = editing;
    const template = { id: previous?.id ?? newTemplateId(), title: field("title").value.trim(), tags: field("tags").value.trim(), body: field("body").value };
    saveButton.setAttribute("aria-busy", "true");
    const result = await write({ action: "save", template, ...(previous && { previous }) });
    saveButton.removeAttribute("aria-busy");
    if (api.signal.aborted || result === undefined) return;
    if (!result) {
      const latest = previous && customTemplates(settings).find(({ id }) => id === previous.id);
      setConflict(previous && !latest ? "deleted" : "changed");
      saveButton.focus();
      return;
    }
    closeDialog();
    showToast(t(previous ? "saved" : "created"));
  }

  listen(resolve, "click", () => {
    if (conflict.dataset.kind === "deleted") {
      editing = undefined;
    } else {
      editing = customTemplates(settings).find(({ id }) => id === editing?.id);
      fill(editing);
    }
    setConflict(undefined);
    render();
    field("title").focus();
  });
  listen(form, "submit", (event) => {
    event.preventDefault();
    void submit();
  });
  listen(form, "keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.isComposing) {
      event.preventDefault();
      void submit();
    }
  });
  for (const name of ["title", "body"]) {
    listen(field(name), "blur", () => { if (attempted || field(name).value) validate(name); });
    listen(field(name), "input", () => { if (field(name).getAttribute("aria-invalid") === "true") validate(name); });
  }
  listen(dialog, "cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });
  listen(find("[data-close]"), "click", closeDialog);
  listen(find("[data-cancel]"), "click", closeDialog);
  keepLineBreaksOnPaste(field("body"), listen);

  // ---------- Export and import ----------
  function exportTemplates() {
    const templates = orderedTemplates(settings, api.locale).filter(({ preset }) => !preset);
    const workbook = writeWorkbook({
      sheetName: t("title"),
      header: [t("name"), t("tags"), t("body")],
      rows: templates.map(({ title, tags, body }) => [title, tags, body]),
      widths: [24, 20, 80],
    });
    const now = new Date();
    const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((part) => String(part).padStart(2, "0")).join("-");
    const url = URL.createObjectURL(workbook);
    const link = doc.createElement("a");
    link.href = url;
    link.download = `${t("fileName")}-${date}.xlsx`;
    link.hidden = true;
    main.append(link);
    link.click();
    link.remove();
    win.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    showToast(t("exported", { count: templates.length }));
  }

  async function importTemplates(file) {
    if (!file || reading || writing || !settings) return;
    reading = true;
    render();
    let result;
    try {
      result = file.size > maxWorkbookBytes ? "importTooLarge" : importedTemplates(await readWorkbook(file), customTemplates(settings));
    } catch {
      result = "importReadError";
    }
    reading = false;
    if (api.signal.aborted) return;
    render();
    if (typeof result === "string") {
      showToast(t(result), "error");
    } else if (!result.templates.length) {
      if (result.skipped) showToast(t("imported", { added: 0, skipped: result.skipped }));
      else showToast(t("importEmpty"), "error");
    } else {
      const changed = await write({ action: "import", templates: result.templates });
      if (changed && !api.signal.aborted) {
        showToast(t("imported", { added: changed.added, skipped: result.skipped + changed.skipped }));
      }
    }
  }

  // ---------- Events ----------
  listen(add, "click", () => openDialog(undefined, add));
  listen(exportButton, "click", exportTemplates);
  listen(importButton, "click", () => { if (!reading) importFile.click(); });
  listen(importFile, "change", () => {
    const [file] = importFile.files;
    importFile.value = "";
    void importTemplates(file);
  });
  listen(presets, "click", () => void togglePresets());
  listen(search, "input", renderList);
  listen(emptyAction, "click", () => {
    if (emptyAction.dataset.action === "new") {
      openDialog(undefined, emptyAction);
      return;
    }
    search.value = "";
    activeTag = "";
    render();
    search.focus();
  });
  listen(find("[data-retry]"), "click", load);
  listen(main, "click", (event) => {
    const tag = event.target.closest("button[data-template-tag]");
    if (tag) {
      activeTag = tag.dataset.templateTag;
      render();
      if (!chips.contains(tag)) chips.querySelector('[aria-pressed="true"]')?.focus();
      return;
    }
    const row = event.target.closest(".pt-card");
    const template = row && templateList(settings, api.locale).find(({ id }) => id === row.dataset.templateId);
    if (!template || writing) return;
    if (event.target.closest("[data-edit]")) openDialog(template, event.target.closest("[data-edit]"));
    else if (event.target.closest("[data-remove]")) void removeTemplate(template);
  });
  // Single-key shortcuts only fire while focus is inside this page and never from a text field.
  listen(main, "keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
    if (dialog.open || editable(event.composedPath()[0])) return;
    event.preventDefault();
    search.focus();
    search.select();
  });
  // Clicking empty page space moves focus into the page so its shortcuts work.
  listen(main, "pointerdown", (event) => {
    if (event.target === main || event.target.classList?.contains("pt-page")) main.focus({ preventScroll: true });
  });

  // ---------- Data ----------
  const skeletonTimer = win.setTimeout(() => {
    showSkeleton = true;
    if (!settings) renderList();
  }, 300);

  function apply(values) {
    settings = values;
    loadFailed = false;
    render();
  }

  function load() {
    loadFailed = false;
    render();
    api.storage.get().then((values) => { if (!api.signal.aborted) apply(values); })
      .catch(() => { if (!api.signal.aborted && !settings) { loadFailed = true; render(); } });
  }

  render();
  const stopSettings = watchSettings(api, apply, () => { loadFailed = true; render(); });
  const stopLocale = api.onLocaleChange(render);

  function dispose() {
    events.abort();
    win.clearTimeout(skeletonTimer);
    hideToast();
    if (dialog.open) dialog.close();
    stopSettings();
    stopLocale();
    main.remove();
  }
  api.signal.addEventListener("abort", dispose, { once: true });
  return dispose;
}

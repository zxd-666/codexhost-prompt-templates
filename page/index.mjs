import {
  customTemplates, language, newTemplateId, orderedTemplates, templateKey, templateList, templateTags, watchSettings,
} from "../shared/library.mjs";
import { bindReorder } from "./reorder.mjs";
import { keepLineBreaksOnPaste } from "../shared/paste.mjs";
import { maxWorkbookBytes, readWorkbook, writeWorkbook } from "./xlsx.mjs";

const copy = {
  zh: {
    title: "提示词模板", new: "新建模板", search: "搜索模板", fields: "名称、标签或正文",
    presets: "显示内置模板", name: "名称", tags: "标签", body: "提示词正文",
    save: "保存", cancel: "取消", edit: "编辑", remove: "删除", confirm: "确认删除",
    builtin: "内置", empty: "没有匹配的模板", loading: "正在读取模板…", loadError: "模板读取失败，请重新打开页面。",
    writeError: "保存失败，请重试。", required: "请填写名称和正文。", saved: "已保存", deleted: "已删除",
    conflict: "这条模板已在其他页面修改，请重新打开后编辑。",
    move: "调整顺序", moveHint: "拖动排序，或用上下方向键移动", orderSaved: "顺序已保存",
    orderConflict: "列表已更新，请重新拖动。",
    tagFilters: "按标签筛选", allTags: "全部模板", tagInput: "多个标签用逗号分隔",
    export: "导出 Excel", import: "导入 Excel", fileName: "提示词模板", exported: "已导出 {count} 条自定义模板",
    imported: "已导入 {added} 条，跳过 {skipped} 条", importReadError: "无法读取这个文件，请选择 .xlsx 格式的 Excel 文件。",
    importHeaderError: "第一行需要包含「名称」和「正文」列。", importEmpty: "表格里没有模板。",
    importLimit: "单次最多导入 1000 条模板。", importTooLarge: "文件不能超过 10 MB。",
  },
  en: {
    title: "Prompt templates", new: "New template", search: "Search templates", fields: "Name, tags, or text",
    presets: "Show built-in templates", name: "Name", tags: "Tags", body: "Prompt text",
    save: "Save", cancel: "Cancel", edit: "Edit", remove: "Delete", confirm: "Confirm deletion",
    builtin: "Built-in", empty: "No matching templates", loading: "Loading templates…", loadError: "Could not load templates. Reopen this page to retry.",
    writeError: "Could not save. Please try again.", required: "Enter a name and prompt text.", saved: "Saved", deleted: "Deleted",
    conflict: "This template changed in another window. Reopen it before editing.",
    move: "Reorder", moveHint: "Drag to reorder, or use the Up and Down arrow keys", orderSaved: "Order saved",
    orderConflict: "The list changed. Move the template again.",
    tagFilters: "Filter by tag", allTags: "All templates", tagInput: "Separate multiple tags with commas",
    export: "Export Excel", import: "Import Excel", fileName: "prompt-templates", exported: "Exported {count} custom templates",
    imported: "Imported {added}, skipped {skipped}", importReadError: "Could not read this file. Choose an .xlsx Excel file.",
    importHeaderError: "The first row needs Name and Prompt text columns.", importEmpty: "The sheet has no templates.",
    importLimit: "Import up to 1,000 templates at a time.", importTooLarge: "The file must be 10 MB or smaller.",
  },
};

const importColumns = {
  title: ["名称", "标题", "name", "title"],
  tags: ["标签", "tags", "tag"],
  body: ["正文", "内容", "提示词正文", "提示词", "prompt text", "prompt", "body", "content"],
};

// Returns { templates, skipped } for valid rows, or a notice key when the sheet cannot be used.
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

export function mount(root, api) {
  const doc = root.ownerDocument;
  const events = new AbortController();
  const listen = (element, type, handler) => element.addEventListener(type, handler, { signal: events.signal });
  let settings;
  let writing = false;
  let reading = false;
  let editing;
  let pendingDelete;
  let pendingPresets;
  let activeTag = "";
  let notice = "loading";
  const t = (key, values = {}) => copy[language(api.locale)][key].replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
  const main = doc.createElement("section");
  main.className = "pt-library";
  main.innerHTML = `
    <header>
      <h1></h1>
      <div class="pt-header-actions">
        <button type="button" data-export data-label="export"></button>
        <button type="button" data-import data-label="import"></button>
        <button class="pt-primary" type="button" data-new></button>
        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden data-import-file>
      </div>
    </header>
    <div class="pt-filters">
      <input type="search" data-search>
      <label><input type="checkbox" data-presets><span></span></label>
    </div>
    <div class="pt-tag-filters" role="group" hidden></div>
    <form hidden>
      <label><span data-label="name"></span><input name="title" maxlength="100" required></label>
      <label><span data-label="tags"></span><input name="tags" maxlength="180"></label>
      <label><span data-label="body"></span><textarea name="body" rows="7" maxlength="20000" required></textarea></label>
      <div class="pt-actions">
        <button type="submit" class="pt-primary" data-label="save"></button>
        <button type="button" data-cancel data-label="cancel"></button>
      </div>
    </form>
    <p class="pt-status" role="status" aria-live="polite"></p>
    <ul class="pt-list"></ul>`;
  root.append(main);

  const find = (selector) => main.querySelector(selector);
  const add = find("[data-new]");
  const exportButton = find("[data-export]");
  const importButton = find("[data-import]");
  const importFile = find("[data-import-file]");
  const search = find("[data-search]");
  const tagFilters = find(".pt-tag-filters");
  const presets = find("[data-presets]");
  const form = find("form");
  const list = find(".pt-list");
  const status = find(".pt-status");
  const field = (name) => form.elements.namedItem(name);
  const cancelReorder = bindReorder(list, events.signal, moveTemplate);

  function focusHandle(id) {
    const row = [...list.children].find((item) => item.dataset.templateId === id);
    row?.querySelector("[data-reorder-handle]:enabled")?.focus();
  }

  function button(label, action) {
    const control = doc.createElement("button");
    control.type = "button";
    control.disabled = writing;
    control.textContent = t(label);
    control.addEventListener("click", action);
    return control;
  }

  function tagButton(key, label) {
    const control = doc.createElement("button");
    control.type = "button";
    control.className = "pt-tag";
    control.dataset.templateTag = key;
    control.textContent = label;
    control.title = label;
    control.setAttribute("aria-pressed", String(key === activeTag));
    return control;
  }

  function renderTagFilters() {
    const tags = new Map();
    for (const template of settings ? templateList(settings, api.locale) : []) {
      for (const { key, label } of templateTags(template.tags)) {
        if (!tags.has(key)) tags.set(key, label);
      }
    }
    if (!tags.has(activeTag)) activeTag = "";
    const focused = tagFilters.querySelector("button:focus")?.dataset.templateTag;
    tagFilters.hidden = !tags.size;
    tagFilters.setAttribute("aria-label", t("tagFilters"));
    const sorted = [...tags].sort((a, b) => a[1].localeCompare(b[1], language(api.locale)));
    const controls = [tagButton("", t("allTags")), ...sorted.map(([key, label]) => tagButton(key, label))];
    const fragment = doc.createDocumentFragment();
    if (tags.size) for (const control of controls) fragment.append(control);
    tagFilters.replaceChildren(fragment);
    if (tags.size && focused !== undefined) {
      (controls.find((control) => control.dataset.templateTag === focused) ?? controls[0]).focus();
    }
  }

  function renderList() {
    const focused = list.querySelector("[data-reorder-handle]:focus")?.closest("li").dataset.templateId;
    cancelReorder();
    list.replaceChildren();
    if (!settings) return;
    const templates = templateList(settings, api.locale, search.value, activeTag);
    if (!templates.length) {
      const empty = doc.createElement("li");
      empty.className = "pt-empty";
      empty.textContent = t("empty");
      list.append(empty);
    }
    for (const template of templates) {
      const row = doc.createElement("li");
      row.dataset.templateId = template.id;
      const handle = doc.createElement("button");
      handle.type = "button";
      handle.className = "pt-drag";
      handle.dataset.reorderHandle = "";
      handle.disabled = writing || templates.length < 2;
      handle.title = t("moveHint");
      handle.setAttribute("aria-label", `${t("move")} ${template.title}`);
      handle.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown");
      const text = doc.createElement("div");
      text.className = "pt-template";
      const title = doc.createElement("h2");
      title.textContent = template.title;
      const preview = doc.createElement("p");
      preview.textContent = template.body;
      text.append(title);
      const tags = templateTags(template.tags);
      if (template.preset || tags.length) {
        const meta = doc.createElement("div");
        meta.className = "pt-template-tags";
        if (template.preset) {
          const builtin = doc.createElement("small");
          builtin.textContent = t("builtin");
          meta.append(builtin);
        }
        meta.append(...tags.map(({ key, label }) => tagButton(key, label)));
        text.append(meta);
      }
      text.append(preview);
      row.append(handle, text);
      if (!template.preset) {
        const actions = doc.createElement("div");
        actions.className = "pt-actions";
        if (pendingDelete?.id === template.id) {
          const confirm = button("confirm", () => void removeTemplate(pendingDelete));
          confirm.className = "pt-danger";
          actions.append(confirm, button("cancel", () => { pendingDelete = undefined; renderList(); }));
        } else {
          actions.append(button("edit", () => openForm(template)), button("remove", () => {
            pendingDelete = template;
            renderList();
          }));
        }
        row.append(actions);
      }
      list.append(row);
    }
    if (focused) focusHandle(focused);
  }

  function render() {
    find("h1").textContent = t("title");
    add.textContent = t("new");
    search.placeholder = t("fields");
    search.setAttribute("aria-label", t("search"));
    field("tags").placeholder = t("tagInput");
    find("[data-presets] + span").textContent = t("presets");
    for (const el of main.querySelectorAll("[data-label]")) el.textContent = t(el.dataset.label);
    add.disabled = !settings || writing;
    exportButton.disabled = !settings || writing || reading;
    importButton.disabled = !settings || writing || reading;
    presets.disabled = !settings || writing;
    presets.checked = pendingPresets ?? (settings?.showPresets !== false);
    for (const el of form.elements) el.disabled = writing;
    // A notice is a copy key, or { key, values } when it carries counts.
    const shown = typeof notice === "string" ? { key: notice } : notice;
    status.textContent = shown ? t(shown.key, shown.values) : "";
    renderTagFilters();
    renderList();
  }

  function openForm(template = null) {
    editing = template;
    pendingDelete = undefined;
    notice = undefined;
    field("title").value = template?.title ?? "";
    field("tags").value = template?.tags ?? "";
    field("body").value = template?.body ?? "";
    form.hidden = false;
    render();
    field("title").focus();
  }

  function closeForm() {
    editing = undefined;
    form.hidden = true;
    add.focus();
  }

  async function write(change, success, afterSave) {
    if (writing || !settings) return;
    writing = true;
    notice = undefined;
    let saved = false;
    render();
    try {
      const changed = await api.backend.invoke("changeLibrary", change);
      if (!changed) {
        notice = change.action === "reorder" ? "orderConflict" : "conflict";
        pendingDelete = undefined;
        return;
      }
      settings = await api.storage.get().catch(() => settings);
      notice = typeof success === "function" ? success(changed) : success;
      saved = true;
    } catch {
      notice = "writeError";
    } finally {
      writing = false;
      pendingPresets = undefined;
      if (!api.signal.aborted) {
        render();
        if (saved) afterSave?.();
      }
    }
  }

  function removeTemplate(template) {
    return write({ action: "remove", previous: template }, "deleted", () => {
      pendingDelete = undefined;
      if (editing?.id === template.id) closeForm();
    });
  }

  async function moveTemplate(move, keyboard) {
    await write({ action: "reorder", ...move, query: search.value, tag: activeTag, locale: api.locale }, "orderSaved");
    if (keyboard && !api.signal.aborted) focusHandle(move.fromId);
  }

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
    doc.defaultView.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    notice = { key: "exported", values: { count: templates.length } };
    render();
  }

  async function importTemplates(file) {
    if (!file || reading || writing || !settings) return;
    reading = true;
    notice = undefined;
    render();
    let result;
    try {
      result = file.size > maxWorkbookBytes ? "importTooLarge" : importedTemplates(await readWorkbook(file), customTemplates(settings));
    } catch {
      result = "importReadError";
    }
    reading = false;
    if (api.signal.aborted) return;
    if (typeof result === "string") {
      notice = result;
    } else if (!result.templates.length) {
      notice = result.skipped ? { key: "imported", values: { added: 0, skipped: result.skipped } } : "importEmpty";
    } else {
      await write({ action: "import", templates: result.templates }, (changed) => ({
        key: "imported",
        values: { added: changed.added, skipped: result.skipped + changed.skipped },
      }));
      return;
    }
    render();
  }

  listen(add, "click", () => openForm());
  listen(exportButton, "click", exportTemplates);
  listen(importButton, "click", () => importFile.click());
  listen(importFile, "change", () => {
    const [file] = importFile.files;
    importFile.value = "";
    void importTemplates(file);
  });
  listen(main, "click", (event) => {
    const control = event.target.closest("button[data-template-tag]");
    if (!control) return;
    activeTag = control.dataset.templateTag;
    for (const tag of tagFilters.children) {
      tag.setAttribute("aria-pressed", String(tag.dataset.templateTag === activeTag));
    }
    renderList();
    if (!tagFilters.contains(control)) tagFilters.querySelector('[aria-pressed="true"]')?.focus();
  });
  listen(search, "input", renderList);
  listen(presets, "change", () => {
    pendingPresets = presets.checked;
    void write({ action: "presets", showPresets: pendingPresets }, "saved");
  });
  listen(find("[data-cancel]"), "click", closeForm);
  keepLineBreaksOnPaste(field("body"), listen);
  listen(form, "submit", (event) => {
    event.preventDefault();
    const previous = editing;
    const title = field("title").value.trim();
    const tags = field("tags").value.trim();
    const body = field("body").value;
    if (!title || !body.trim()) {
      notice = "required";
      render();
      return;
    }
    const template = { id: previous?.id ?? newTemplateId(), title, tags, body };
    void write({ action: "save", template, ...(previous && { previous }) }, "saved", closeForm);
  });

  render();
  const stopSettings = watchSettings(api, (values) => {
    settings = values;
    if (notice === "loading" || notice === "loadError") notice = undefined;
    render();
  }, () => { notice = "loadError"; render(); });
  const stopLocale = api.onLocaleChange(render);
  function dispose() {
    events.abort();
    stopSettings();
    stopLocale();
    main.remove();
  }
  api.signal.addEventListener("abort", dispose, { once: true });
  return dispose;
}

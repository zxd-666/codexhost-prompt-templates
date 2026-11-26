import { language, templateList, templateTags, watchSettings } from "../shared/library.mjs";
import { bindReorder } from "./reorder.mjs";

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
  },
};

export function mount(root, api) {
  const doc = root.ownerDocument;
  const events = new AbortController();
  const listen = (element, type, handler) => element.addEventListener(type, handler, { signal: events.signal });
  let settings;
  let writing = false;
  let editing;
  let pendingDelete;
  let pendingPresets;
  let activeTag = "";
  let notice = "loading";
  const t = (key) => copy[language(api.locale)][key];
  const main = doc.createElement("section");
  main.className = "pt-library";
  main.innerHTML = `
    <header><h1></h1><button class="pt-primary" type="button" data-new></button></header>
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
    presets.disabled = !settings || writing;
    presets.checked = pendingPresets ?? (settings?.showPresets !== false);
    for (const el of form.elements) el.disabled = writing;
    status.textContent = notice ? t(notice) : "";
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
      notice = success;
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

  listen(add, "click", () => openForm());
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
    const randomId = () => Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)),
      (part) => part.toString(16).padStart(8, "0")).join("");
    const template = { id: previous?.id ?? `custom:${randomId()}`, title, tags, body };
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

import { language, newTemplateId, templateList, templateTags, watchSettings } from "../shared/library.mjs";
import { findComposer, insertTemplate, selectionIn, submitTemplate } from "./composer.mjs";
import { keepLineBreaksOnPaste } from "../shared/paste.mjs";
import { icon } from "../shared/icons.mjs";

const copy = {
  zh: {
    label: "提示词模板", search: "搜索提示词", empty: "没有找到“{query}”，换个关键词试试", emptyTag: "这个标签下没有模板",
    emptyLibrary: "还没有模板，点 ＋ 新建第一条", loading: "正在读取模板…",
    allTags: "全部", tagFilters: "按标签筛选",
    loadError: "模板没能读出来，请关闭弹窗后重新打开。", insertError: "插入失败，请点一下输入框后再试。",
    create: "新建模板", name: "名称", tags: "标签（可选）", body: "提示词正文", tagsHint: "多个标签用逗号分隔",
    save: "保存", cancel: "取消", created: "已新建模板",
    required: "请填写名称和正文。", saveError: "保存失败，请检查 Host 连接后重试。",
    edit: "编辑模板", insert: "插入输入框", send: "直接发送", copy: "另存内置模板", saveCopy: "另存为模板",
    updated: "已保存模板", editConflict: "这条模板已在其他端修改，请重新打开后再编辑。",
    draftPresent: "输入框里有草稿或附件，请先处理再直接发送。",
    sendBusy: "对话正在生成，请稍后直接发送。", sendFallback: "请检查输入框内容，再使用发送按钮。",
  },
  en: {
    label: "Prompt templates", search: "Search prompts", empty: "Nothing matches “{query}”. Try another keyword.", emptyTag: "No templates with this tag",
    emptyLibrary: "No templates yet. Use + to create one.", loading: "Loading templates…",
    allTags: "All", tagFilters: "Filter by tag",
    loadError: "Templates did not load. Close this menu and open it again.", insertError: "Could not insert. Click the composer and try again.",
    create: "New template", name: "Name", tags: "Tags (optional)", body: "Prompt text", tagsHint: "Separate multiple tags with commas",
    save: "Save", cancel: "Cancel", created: "Template created",
    required: "Enter a name and prompt text.", saveError: "Could not save. Check the Host connection and try again.",
    edit: "Edit template", insert: "Insert into composer", send: "Send directly", copy: "Copy built-in template", saveCopy: "Save as template",
    updated: "Template saved", editConflict: "This template changed elsewhere. Reopen it before editing.",
    draftPresent: "Finish or clear the current draft and attachments before sending directly.",
    sendBusy: "The chat is generating a response. Try again shortly.", sendFallback: "Review the composer before using its Send button.",
  },
};

export function mount(root, api) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const host = root.getRootNode().host;
  const events = new AbortController();
  const listen = (node, type, handler, options = {}) => node.addEventListener(type, handler, { ...options, signal: events.signal });
  const t = (key, values = {}) => copy[language(api.locale)][key].replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
  root.innerHTML = `
    <button class="pt-trigger" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="pt-menu">${icon("template")}</button>
    <section id="pt-menu" class="pt-menu" role="dialog" popover="manual">
      <div class="pt-picker">
        <div class="pt-picker-bar">
          <input type="search" autocomplete="off">
          <button class="pt-new" type="button" aria-controls="pt-create">${icon("plus")}</button>
        </div>
        <div class="pt-tag-row" role="group" hidden></div>
        <p class="pt-message" role="status"></p>
        <ul class="pt-results"></ul>
      </div>
      <form id="pt-create" class="pt-create" hidden>
        <h2></h2>
        <label><span data-copy="name"></span><input name="title" maxlength="100" required></label>
        <label><span data-copy="tags"></span><input name="tags" maxlength="180"></label>
        <label><span data-copy="body"></span><textarea name="body" rows="3" maxlength="20000" required></textarea></label>
        <p class="pt-form-message" role="status"></p>
        <div class="pt-form-actions">
          <button type="submit">${icon("loader")}<span></span></button>
          <button type="button" data-cancel data-copy="cancel"></button>
        </div>
      </form>
    </section>`;
  const trigger = root.querySelector("button");
  const menu = root.querySelector("section");
  const picker = root.querySelector(".pt-picker");
  const add = root.querySelector(".pt-new");
  const search = root.querySelector('input[type="search"]');
  const tagRow = root.querySelector(".pt-tag-row");
  const message = root.querySelector(".pt-message");
  const results = root.querySelector("ul");
  const form = root.querySelector(".pt-create");
  const field = (name) => form.elements.namedItem(name);
  const save = form.querySelector('[type="submit"]');
  const saveLabel = save.querySelector("span");
  const formMessage = form.querySelector(".pt-form-message");
  const formCopy = form.querySelectorAll("[data-copy]");
  const formTitle = form.querySelector("h2");
  let settings;
  let settingsError = false;
  let input;
  let caret;
  let open = false;
  let formOpen = false;
  let editing;
  let saving = false;
  let sending = false;
  let pendingTemplate;
  let activeTag = "";
  let notice = "";
  let formError = "";
  let frame = 0;

  function positionMenu() {
    if (!open) return;
    const viewport = win.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? win.innerWidth;
    const height = viewport?.height ?? win.innerHeight;
    const bounds = trigger.getBoundingClientRect();
    const menuWidth = Math.min(340, width - 16);
    const spaceAbove = bounds.top - top - 16;
    const spaceBelow = top + height - bounds.bottom - 16;
    const above = spaceAbove >= 240 || spaceAbove >= spaceBelow;
    menu.style.setProperty("--pt-width", `${menuWidth}px`);
    menu.style.setProperty("--pt-left", `${Math.max(left + 8, Math.min(bounds.left, left + width - menuWidth - 8))}px`);
    menu.style.setProperty("--pt-available-height", `${Math.max(0, above ? spaceAbove : spaceBelow)}px`);
    menu.style.setProperty("--pt-top", above ? "auto" : `${bounds.bottom + 6}px`);
    menu.style.setProperty("--pt-bottom", above ? `${win.innerHeight - bounds.top + 6}px` : "auto");
  }

  function closeMenu() {
    if (!open) return;
    open = false;
    formOpen = false;
    menu.hidePopover();
    trigger.setAttribute("aria-expanded", "false");
  }

  function align() {
    const composer = findComposer(doc, api.hostTarget, input);
    if (composer?.input !== input) {
      closeMenu();
      input = composer?.input;
      caret = undefined;
    }
    if (!composer) {
      host.removeAttribute("data-pt-docked");
      if (host.parentElement !== doc.body) doc.body.append(host);
      return;
    }
    if (composer.start.nextElementSibling !== host) composer.start.after(host);
    host.setAttribute("data-pt-docked", "");
    positionMenu();
  }

  function schedule() {
    if (frame) return;
    frame = win.requestAnimationFrame(() => { frame = 0; align(); });
  }

  function useTemplate(template) {
    const current = findComposer(doc, api.hostTarget, input)?.input;
    if (current && current === input && insertTemplate(current, caret, template.body)) {
      closeMenu();
      return;
    }
    notice = "insertError";
    render();
  }

  async function sendFromPicker(template) {
    const composer = findComposer(doc, api.hostTarget, input);
    if (sending || !composer || composer.input !== input) return;
    sending = true;
    notice = "";
    render();
    try {
      const result = await submitTemplate(composer, api.hostTarget, template.body, () =>
        open && !api.signal.aborted && findComposer(doc, api.hostTarget, input)?.input === composer.input);
      if (open && !api.signal.aborted) {
        if (result === "submitted") closeMenu();
        else notice = result;
      }
    } catch {
      notice = "sendFallback";
    } finally {
      sending = false;
      if (open && !api.signal.aborted) render();
    }
  }

  function resultAction(template, action, glyph, perform) {
    const control = doc.createElement("button");
    control.type = "button";
    control.className = "pt-result-action";
    control.dataset.action = action;
    control.innerHTML = icon(glyph);
    control.title = t(action);
    control.setAttribute("aria-label", `${t(action)} ${template.title}`);
    control.disabled = sending;
    control.addEventListener("click", perform);
    return control;
  }

  function tagButton(key, label) {
    const control = doc.createElement("button");
    control.type = "button";
    control.className = "pt-tag";
    control.dataset.tag = key;
    control.textContent = label;
    control.title = label;
    control.setAttribute("aria-pressed", String(key === activeTag));
    return control;
  }

  // The tag row lists every tag in the visible library, so it stays stable while the user types a search.
  function renderTags() {
    const tags = new Map();
    for (const template of settings ? templateList(settings, api.locale) : []) {
      for (const { key, label } of templateTags(template.tags)) {
        if (!tags.has(key)) tags.set(key, label);
      }
    }
    if (!tags.has(activeTag)) activeTag = "";
    const focused = tagRow.querySelector("button:focus")?.dataset.tag;
    const sorted = [...tags].sort((a, b) => a[1].localeCompare(b[1], language(api.locale)));
    const controls = tags.size ? [tagButton("", t("allTags")), ...sorted.map(([key, label]) => tagButton(key, label))] : [];
    tagRow.hidden = !tags.size;
    tagRow.setAttribute("aria-label", t("tagFilters"));
    tagRow.replaceChildren(...controls);
    if (focused !== undefined) (controls.find((control) => control.dataset.tag === focused) ?? controls[0])?.focus();
  }

  function render() {
    trigger.title = t("label");
    trigger.setAttribute("aria-label", t("label"));
    menu.setAttribute("aria-label", t("label"));
    search.placeholder = t("search");
    search.setAttribute("aria-label", t("search"));
    add.title = t("create");
    add.setAttribute("aria-label", t("create"));
    add.disabled = saving || sending;
    field("tags").placeholder = t("tagsHint");
    formTitle.textContent = t(editing?.preset ? "copy" : editing ? "edit" : "create");
    for (const element of formCopy) element.textContent = t(element.dataset.copy);
    for (const control of form.elements) control.disabled = saving;
    // While saving, the button keeps its label and shows a spinner.
    saveLabel.textContent = t(editing?.preset ? "saveCopy" : "save");
    save.setAttribute("aria-busy", String(saving));
    menu.dataset.scheme = api.colorScheme === "dark" ? "dark" : "light";
    formMessage.textContent = formError ? t(formError) : "";
    picker.hidden = formOpen;
    form.hidden = !formOpen;
    if (!open || formOpen) return;
    renderTags();
    const templates = settings ? templateList(settings, api.locale, search.value, activeTag) : [];
    message.textContent = notice ? t(notice) : settings ? (templates.length ? "" : emptyMessage()) : t(settingsError ? "loadError" : "loading");
    results.replaceChildren();
    for (const template of templates) {
      const li = doc.createElement("li");
      const item = doc.createElement("button");
      item.type = "button";
      item.className = "pt-result-title";
      item.textContent = template.title;
      item.title = template.title;
      item.disabled = sending;
      item.addEventListener("click", () => useTemplate(template));
      li.append(
        item,
        resultAction(template, "edit", "pencil", () => openEditor(template)),
        resultAction(template, "insert", "insert", () => useTemplate(template)),
        resultAction(template, "send", "send", () => void sendFromPicker(template)),
      );
      results.append(li);
    }
  }

  function emptyMessage() {
    const query = search.value.trim();
    if (query) return t("empty", { query });
    return activeTag ? t("emptyTag") : t("emptyLibrary");
  }

  function openEditor(template) {
    if (template || editing) {
      form.reset();
      pendingTemplate = undefined;
    }
    editing = template;
    if (template) {
      field("title").value = template.title;
      field("tags").value = template.tags;
      field("body").value = template.body;
    }
    formOpen = true;
    formError = "";
    render();
    field("title").focus();
  }

  function returnToPicker(focus) {
    form.reset();
    pendingTemplate = undefined;
    formOpen = false;
    editing = undefined;
    formError = "";
    render();
    if (open) focus.focus({ preventScroll: true });
  }

  async function saveTemplate(event) {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;
    const title = field("title").value.trim();
    const tags = field("tags").value.trim();
    const body = field("body").value;
    if (!title || !body.trim()) {
      formError = "required";
      render();
      return;
    }

    saving = true;
    const previous = editing?.preset ? undefined : editing;
    formError = "";
    render();
    let saved = false;
    try {
      if (!pendingTemplate || pendingTemplate.title !== title || pendingTemplate.tags !== tags || pendingTemplate.body !== body) {
        pendingTemplate = { id: previous?.id ?? newTemplateId(), title, tags, body };
      }
      saved = await api.backend.invoke("changeLibrary", {
        action: "save", template: pendingTemplate, ...(previous && { previous }),
      });
      if (saved) settings = await api.storage.get().catch(() => settings);
      else formError = previous ? "editConflict" : "saveError";
    } catch {
      formError = "saveError";
    } finally {
      saving = false;
      if (!api.signal.aborted) {
        if (saved) {
          notice = previous ? "updated" : "created";
          search.value = "";
          results.scrollTop = 0;
          returnToPicker(search);
        } else {
          render();
          if (open && formOpen) save.focus({ preventScroll: true });
        }
      }
    }
  }

  function rememberCaret() {
    if (input && doc.activeElement === input) caret = selectionIn(input) ?? caret;
  }

  listen(trigger, "pointerdown", rememberCaret);
  listen(trigger, "click", () => {
    if (open) { closeMenu(); return; }
    if (!input) return;
    open = true;
    notice = "";
    search.value = "";
    activeTag = "";
    trigger.setAttribute("aria-expanded", "true");
    positionMenu();
    render();
    menu.showPopover();
    // Scroll positions only apply once the popover is displayed.
    tagRow.scrollLeft = 0;
    results.scrollTop = 0;
    if (win.matchMedia("(pointer: fine)").matches) search.focus({ preventScroll: true });
  });
  listen(search, "input", () => {
    notice = "";
    results.scrollTop = 0;
    render();
  });
  listen(tagRow, "click", (event) => {
    const control = event.target.closest("[data-tag]");
    if (!control) return;
    activeTag = control.dataset.tag;
    notice = "";
    results.scrollTop = 0;
    render();
  });
  // A mouse wheel only scrolls vertically, so map it onto the horizontal tag row.
  listen(tagRow, "wheel", (event) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || tagRow.scrollWidth <= tagRow.clientWidth) return;
    event.preventDefault();
    tagRow.scrollLeft += event.deltaY;
  }, { passive: false });
  listen(add, "click", () => openEditor());
  listen(form.querySelector("[data-cancel]"), "click", () => returnToPicker(editing ? search : add));
  listen(form, "submit", saveTemplate);
  keepLineBreaksOnPaste(field("body"), listen);
  listen(root, "keydown", (event) => {
    if (!open || event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (formOpen) {
        if (!saving) returnToPicker(editing ? search : add);
      } else {
        closeMenu();
        trigger.focus();
      }
      return;
    }
    if (formOpen && event.key === "Enter" && form.contains(event.target)) event.stopPropagation();
    // Up and Down move between result rows; Up from the first row returns to search.
    const titles = [...results.querySelectorAll(".pt-result-title:enabled")];
    const row = titles.indexOf(event.target.closest?.(".pt-result-title"));
    if (row >= 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      event.stopPropagation();
      const next = event.key === "ArrowDown" ? titles[row + 1] : row ? titles[row - 1] : search;
      next?.focus();
      return;
    }
    if (event.target !== search) return;
    const first = results.querySelector(".pt-result-title");
    if (first && (event.key === "ArrowDown" || event.key === "Enter")) {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Enter") first.click();
      else first.focus();
    }
  });
  listen(doc, "pointerdown", (event) => {
    if (!event.composedPath().includes(host)) closeMenu();
  }, { capture: true });
  listen(doc, "selectionchange", rememberCaret);
  listen(doc, "focusin", schedule);
  listen(doc, "scroll", positionMenu, { capture: true, passive: true });
  listen(win, "resize", schedule);
  if (win.visualViewport) {
    listen(win.visualViewport, "resize", positionMenu);
    listen(win.visualViewport, "scroll", positionMenu);
  }

  // Only move the widget's own shadow host. The toolbar keeps its original controls and scroll layout.
  const observer = new win.MutationObserver(schedule);
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["contenteditable", "hidden", "inert", "aria-hidden"] });
  const stopSettings = watchSettings(api, (value) => { settings = value; render(); }, () => { settingsError = true; render(); });
  const stopLocale = api.onLocaleChange(render);
  const stopScheme = api.onColorSchemeChange?.(render);
  render();
  align();

  function dispose() {
    events.abort();
    observer.disconnect();
    win.cancelAnimationFrame(frame);
    stopSettings();
    stopLocale();
    stopScheme?.();
    closeMenu();
    root.replaceChildren();
    host.removeAttribute("data-pt-docked");
  }
  api.signal.addEventListener("abort", dispose, { once: true });
  return dispose;
}

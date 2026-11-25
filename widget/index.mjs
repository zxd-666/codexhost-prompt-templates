import { language, templateList, watchSettings } from "../shared/library.mjs";
import { findComposer, insertTemplate, selectionIn } from "./composer.mjs";

const copy = {
  zh: { label: "提示词模板", search: "搜索提示词", empty: "没有匹配的模板", loading: "正在读取模板…", loadError: "模板读取失败", insertError: "插入失败，请确认输入框可编辑。" },
  en: { label: "Prompt templates", search: "Search prompts", empty: "No matching templates", loading: "Loading templates…", loadError: "Could not load templates", insertError: "Could not insert. Make sure the composer is editable." },
};

export function mount(root, api) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const host = root.getRootNode().host;
  const events = new AbortController();
  const listen = (node, type, handler, options = {}) => node.addEventListener(type, handler, { ...options, signal: events.signal });
  const t = (key) => copy[language(api.locale)][key];
  root.innerHTML = `
    <button class="pt-trigger" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="pt-menu"><span aria-hidden="true" class="pt-icon"></span></button>
    <section id="pt-menu" class="pt-menu" role="dialog" popover="manual">
      <input type="search" autocomplete="off">
      <p class="pt-message" role="status"></p>
      <ul class="pt-results"></ul>
    </section>`;
  const trigger = root.querySelector("button");
  const menu = root.querySelector("section");
  const search = root.querySelector("input");
  const message = root.querySelector(".pt-message");
  const results = root.querySelector("ul");
  let settings;
  let settingsError = false;
  let input;
  let caret;
  let open = false;
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
    message.textContent = t("insertError");
  }

  function render() {
    trigger.title = t("label");
    trigger.setAttribute("aria-label", t("label"));
    menu.setAttribute("aria-label", t("label"));
    search.placeholder = t("search");
    search.setAttribute("aria-label", t("search"));
    if (!open) return;
    const templates = settings ? templateList(settings, api.locale, search.value) : [];
    message.textContent = settings ? (templates.length ? "" : t("empty")) : t(settingsError ? "loadError" : "loading");
    results.replaceChildren();
    for (const template of templates) {
      const li = doc.createElement("li");
      const item = doc.createElement("button");
      item.type = "button";
      item.textContent = template.title;
      item.title = template.title;
      item.addEventListener("click", () => useTemplate(template));
      li.append(item);
      results.append(li);
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
    search.value = "";
    results.scrollTop = 0;
    trigger.setAttribute("aria-expanded", "true");
    positionMenu();
    render();
    menu.showPopover();
    if (win.matchMedia("(pointer: fine)").matches) search.focus({ preventScroll: true });
  });
  listen(search, "input", () => {
    results.scrollTop = 0;
    render();
  });
  listen(root, "keydown", (event) => {
    if (!open || event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      trigger.focus();
      return;
    }
    if (event.target !== search) return;
    const first = results.querySelector("button");
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
  render();
  align();

  function dispose() {
    events.abort();
    observer.disconnect();
    win.cancelAnimationFrame(frame);
    stopSettings();
    stopLocale();
    closeMenu();
    root.replaceChildren();
    host.removeAttribute("data-pt-docked");
  }
  api.signal.addEventListener("abort", dispose, { once: true });
  return dispose;
}

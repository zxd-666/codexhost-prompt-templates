const request = "[data-codex-composer-request], [data-codex-composer-request-navigation]";
const submitLabel = ':is([aria-label="发送"], [aria-label="发送消息"], [aria-label="Send"], [aria-label="Send message"])';
const stopLabel = ':is([aria-label="停止"], [aria-label="停止生成"], [aria-label="Stop"], [aria-label="Stop generating"])';
const surfaces = {
  web: {
    card: "[data-composer-card]", editor: "[data-composer-input]",
    anchor: '[data-composer-tools] > [data-toolbar-fixed="start"]',
    actions: '[data-toolbar-fixed="end"]',
    extras: '[role="group"]:is([aria-label="待发送附件"], [aria-label="Pending attachments"]), [data-composer-annotations]',
  },
  desktop: {
    card: "[data-codex-composer-root]", editor: "[data-codex-composer], .ProseMirror[role=textbox]",
    anchor: '[data-composer-leading-controls] [data-composer-navigation-target="add-context"]',
    actions: "[data-composer-trailing-controls]",
    extras: "[data-composer-attachment-pill], [data-composer-attachments] > *, [data-attachment-id], [data-appshot-attachment-card]",
  },
};

function visible(element) {
  return element && element.getClientRects().length &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
    element.ownerDocument.defaultView.getComputedStyle(element).visibility === "visible";
}

export function findComposer(doc, target, preferred) {
  const { card, editor, anchor } = surfaces[target];
  const available = [];
  for (const container of doc.querySelectorAll(card)) {
    const input = container.querySelector(editor);
    const start = container.querySelector(anchor);
    if (input?.closest(card) !== container || start?.closest(card) !== container) continue;
    const anchorVisible = visible(start) || visible(start.querySelector("button"));
    if (!input.isContentEditable || !visible(input) || !anchorVisible) continue;
    if (container.closest(request) || container.querySelector(request)) continue;
    const candidate = { container, input, start };
    if (input === doc.activeElement) return candidate;
    available.push(candidate);
  }
  return available.find(({ input }) => input === preferred) ?? (available.length === 1 ? available[0] : undefined);
}

function normalizeDraft(text) {
  return text.replace(/\r\n?/gu, "\n").replace(/\u00a0/gu, " ").trim();
}

export async function submitTemplate({ container, input }, target, body, isCurrent) {
  const { actions, extras } = surfaces[target];
  const hasExtras = () => [...container.querySelectorAll(extras)].some(visible) ||
    [...input.querySelectorAll('[contenteditable="false"], img')].some(visible);
  const busy = () => [...container.querySelectorAll(`${actions} button${stopLabel}`)].some(visible);
  if (normalizeDraft(input.innerText) || hasExtras()) return "draftPresent";
  if (busy()) return "sendBusy";
  if (!insertTemplate(input, undefined, body)) return "insertError";

  const doc = input.ownerDocument;
  const win = doc.defaultView;
  const expected = normalizeDraft(body);
  const deadline = win.performance.now() + 750;
  // The native editor may update the composer controls after the paste event returns.
  do {
    await new Promise((resolve) => win.setTimeout(resolve, 25));
    if (!isCurrent() || doc.activeElement !== input || hasExtras() || busy()) return "sendFallback";
    const actual = normalizeDraft(input.innerText);
    if (actual && actual !== expected) return "sendFallback";
    const send = [...container.querySelectorAll(`${actions} button${submitLabel}`)].find(visible);
    if (actual === expected && send && !send.disabled && send.getAttribute("aria-disabled") !== "true") {
      send.click();
      return "submitted";
    }
  } while (win.performance.now() < deadline);

  return normalizeDraft(input.innerText) ? "sendFallback" : "insertError";
}

export function selectionIn(input) {
  const selection = input.ownerDocument.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (input.contains(range.startContainer) && input.contains(range.endContainer)) {
    const caret = range.cloneRange();
    caret.collapse(false);
    return caret;
  }
}

export function insertTemplate(input, caret, body) {
  if (!input.isConnected || !input.isContentEditable) return false;
  const doc = input.ownerDocument;
  const win = doc.defaultView;
  input.focus({ preventScroll: true });
  const selection = doc.getSelection();
  if (!selection) return false;
  const range = caret && input.contains(caret.startContainer) ? caret : doc.createRange();
  if (range !== caret) {
    range.selectNodeContents(input);
    range.collapse(false);
  }
  selection.removeAllRanges();
  selection.addRange(range);

  // Let the editor process the text as a native paste so its draft, undo, and send state stay in sync.
  const text = new win.DataTransfer();
  text.setData("text/plain", body);
  const paste = new win.ClipboardEvent("paste", { clipboardData: text, bubbles: true, cancelable: true, composed: true });
  if (!input.dispatchEvent(paste)) return true;
  return doc.execCommand("insertText", false, body);
}

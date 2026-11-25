const request = "[data-codex-composer-request], [data-codex-composer-request-navigation]";
const surfaces = {
  web: { card: "[data-composer-card]", editor: "[data-composer-input]", anchor: '[data-composer-tools] > [data-toolbar-fixed="start"]' },
  desktop: { card: "[data-codex-composer-root]", editor: "[data-codex-composer], .ProseMirror[role=textbox]", anchor: '[data-composer-leading-controls] [data-composer-navigation-target="add-context"]' },
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
    const candidate = { input, start };
    if (input === doc.activeElement) return candidate;
    available.push(candidate);
  }
  return available.find(({ input }) => input === preferred) ?? (available.length === 1 ? available[0] : undefined);
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

// Some rich-text sources put paragraphs side by side in text/plain and keep
// the line structure only in text/html. When that happens, rebuild the line
// breaks from the HTML. Every other paste keeps the browser's native behavior.

const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DETAILS", "DIV", "DL", "DT",
  "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6",
  "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "SUMMARY",
  "TABLE", "TBODY", "TFOOT", "THEAD", "TR", "UL",
]);
const SKIPPED_TAGS = new Set(["HEAD", "META", "NOSCRIPT", "SCRIPT", "STYLE", "TEMPLATE", "TITLE"]);
const LIST_MARKER = /^\s*(\d+[.)、．]|[-*•·▪◦])/;

export function keepLineBreaksOnPaste(textarea, listen) {
  listen(textarea, "paste", (event) => {
    const text = textFromClipboard(event.clipboardData, textarea.ownerDocument);
    if (text === undefined) return;
    event.preventDefault();
    insertText(textarea, text);
  });
}

function textFromClipboard(data, doc) {
  if (!data) return undefined;
  const plain = data.getData("text/plain").replace(/\r\n?/g, "\n");
  if (plain.includes("\n")) return undefined;
  const html = data.getData("text/html");
  if (!html) return undefined;
  const text = htmlToText(html, doc);
  if (!text) return undefined;
  if (plain && !text.includes("\n")) return undefined;
  return text;
}

// Follows the line-break rules of innerText: <p> is separated by a blank line,
// other blocks start on a new line, and whitespace collapses outside <pre>.
function htmlToText(html, doc) {
  const body = new doc.defaultView.DOMParser().parseFromString(html, "text/html").body;
  let text = "";
  let pendingBreaks = 0;
  let preDepth = 0;

  const requireBreaks = (count) => {
    pendingBreaks = Math.max(pendingBreaks, count);
  };
  const write = (chunk) => {
    if (!chunk) return;
    if (text && pendingBreaks) {
      const trailingBreaks = text.length - text.replace(/\n+$/, "").length;
      text += "\n".repeat(Math.max(0, pendingBreaks - trailingBreaks));
    }
    pendingBreaks = 0;
    text += chunk;
  };
  const writeText = (data) => {
    if (preDepth) {
      write(data.replace(/\r\n?/g, "\n"));
      return;
    }
    let chunk = data.replace(/[\t\n\r\f ]+/g, " ");
    const atLineStart = !text || pendingBreaks > 0 || /[\n ]$/.test(text);
    if (atLineStart) chunk = chunk.replace(/^ /, "");
    write(chunk);
  };
  const listMarker = (item) => {
    const list = item.parentElement;
    if (LIST_MARKER.test(item.textContent.replace(/\u00a0/g, " "))) return "";
    if (list?.tagName === "UL") return "- ";
    if (list?.tagName !== "OL") return "";
    const start = Number.parseInt(list.getAttribute("start"), 10) || 1;
    const position = [...list.children].filter((child) => child.tagName === "LI").indexOf(item);
    return `${start + position}. `;
  };
  const visit = (node) => {
    if (node.nodeType === node.TEXT_NODE) {
      writeText(node.data);
      return;
    }
    if (node.nodeType !== node.ELEMENT_NODE || SKIPPED_TAGS.has(node.tagName)) return;
    if (node.tagName === "BR") {
      write("\n");
      return;
    }
    const block = BLOCK_TAGS.has(node.tagName);
    const breaks = node.tagName === "P" ? 2 : 1;
    if (block) requireBreaks(breaks);
    if (node.tagName === "LI") write(listMarker(node));
    if ((node.tagName === "TD" || node.tagName === "TH") && node.previousElementSibling) write("\t");
    if (node.tagName === "PRE") preDepth += 1;
    node.childNodes.forEach(visit);
    if (node.tagName === "PRE") preDepth -= 1;
    if (block) requireBreaks(breaks);
  };

  visit(body);
  return text
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function insertText(textarea, text) {
  textarea.focus();
  const doc = textarea.ownerDocument;
  if (doc.execCommand?.("insertText", false, text)) return;
  const { selectionStart: start, selectionEnd: end, maxLength } = textarea;
  const room = maxLength < 0 ? text.length : maxLength - textarea.value.length + (end - start);
  textarea.setRangeText(text.slice(0, Math.max(0, room)), start, end, "end");
  textarea.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
}

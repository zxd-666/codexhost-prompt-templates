// Minimal .xlsx support for one sheet of plain text cells. No third-party library is bundled.
const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const maxWorkbookBytes = 10 * 1024 * 1024;
const maxPartBytes = 50 * 1024 * 1024;
const mainNs = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const relNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const xmlHead = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// fields: [offset, byteLength (2 or 4), value]
function record(length, fields) {
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  for (const [offset, size, value] of fields) {
    if (size === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value, true);
  }
  return bytes;
}

// Stored (uncompressed) ZIP with UTF-8 names. Every part is small text, so compression is not needed.
function zip(files, type) {
  const parts = [];
  const directory = [];
  let offset = 0;
  for (const [name, text] of files) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(text);
    const crc = crc32(data);
    const shared = [[8, 2, 0x0800], [10, 2, 0], [12, 2, 0], [14, 2, 0x21], [16, 4, crc], [20, 4, data.length], [24, 4, data.length], [28, 2, nameBytes.length]];
    // Local headers use the same fields as the central directory, shifted 2 bytes earlier.
    const local = record(30, [[0, 4, 0x04034b50], [4, 2, 20], ...shared.map(([at, size, value]) => [at - 2, size, value])]);
    const central = record(46, [[0, 4, 0x02014b50], [4, 2, 20], [6, 2, 20], ...shared, [42, 4, offset]]);
    parts.push(local, nameBytes, data);
    directory.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const directorySize = directory.reduce((total, part) => total + part.length, 0);
  const end = record(22, [[0, 4, 0x06054b50], [8, 2, files.length], [10, 2, files.length], [12, 4, directorySize], [16, 4, offset]]);
  return new Blob([...parts, ...directory, end], { type });
}

function escapeXml(text) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    // Excel reads _xHHHH_ as an escaped character, so a literal one needs its underscore escaped.
    .replace(/_(?=x[0-9a-f]{4}_)/gi, "_x005F_")
    .replace(/[&<>"]/g, (char) => entities[char]);
}

function columnName(index) {
  let name = "";
  for (let rest = index + 1; rest > 0; rest = Math.floor((rest - 1) / 26)) {
    name = String.fromCharCode(65 + ((rest - 1) % 26)) + name;
  }
  return name;
}

export function writeWorkbook({ sheetName, header, rows, widths }) {
  const cell = (value, rowIndex, columnIndex, style) =>
    `<c r="${columnName(columnIndex)}${rowIndex + 1}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  const sheetRows = [header, ...rows].map((row, rowIndex) =>
    `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => cell(value, rowIndex, columnIndex, rowIndex ? 1 : 2)).join("")}</row>`);
  const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`);
  const sheet = `${xmlHead}<worksheet xmlns="${mainNs}"><sheetViews><sheetView workbookViewId="0">` +
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${cols.join("")}</cols><sheetData>${sheetRows.join("")}</sheetData></worksheet>`;
  const styles = `${xmlHead}<styleSheet xmlns="${mainNs}">` +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  const relationship = (id, kind, target) =>
    `<Relationship Id="${id}" Type="${relNs}/${kind}" Target="${target}"/>`;
  const relationships = (items) =>
    `${xmlHead}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.join("")}</Relationships>`;
  const contentType = (part, kind) =>
    `<Override PartName="${part}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.${kind}+xml"/>`;
  return zip([
    ["[Content_Types].xml", `${xmlHead}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      contentType("/xl/workbook.xml", "sheet.main") + contentType("/xl/worksheets/sheet1.xml", "worksheet") +
      contentType("/xl/styles.xml", "styles") + "</Types>"],
    ["_rels/.rels", relationships([relationship("rId1", "officeDocument", "xl/workbook.xml")])],
    ["xl/workbook.xml", `${xmlHead}<workbook xmlns="${mainNs}" xmlns:r="${relNs}"><sheets>` +
      `<sheet name="${escapeXml(sheetName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", relationships([
      relationship("rId1", "worksheet", "worksheets/sheet1.xml"),
      relationship("rId2", "styles", "styles.xml"),
    ])],
    ["xl/styles.xml", styles],
    ["xl/worksheets/sheet1.xml", sheet],
  ], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

async function inflate(data, size) {
  const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  const output = new Uint8Array(size);
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    // Stop as soon as the stream grows past its declared size instead of trusting the header.
    if (length + value.length > size) {
      await reader.cancel();
      throw new Error("ZIP entry is larger than declared");
    }
    output.set(value, length);
    length += value.length;
  }
  if (length !== size) throw new Error("ZIP entry is truncated");
  return output;
}

function openZip(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let end = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 22 - 0xffff); at--) {
    if (view.getUint32(at, true) === 0x06054b50) {
      end = at;
      break;
    }
  }
  if (end < 0) throw new Error("Not a ZIP file");
  const entries = new Map();
  let at = view.getUint32(end + 16, true);
  for (let count = view.getUint16(end + 10, true); count > 0; count--) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error("Broken ZIP directory");
    const nameLength = view.getUint16(at + 28, true);
    entries.set(decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength)), {
      method: view.getUint16(at + 10, true),
      compressedSize: view.getUint32(at + 20, true),
      size: view.getUint32(at + 24, true),
      offset: view.getUint32(at + 42, true),
    });
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  return async (name) => {
    const entry = entries.get(name);
    if (!entry) return;
    if (entry.size > maxPartBytes) throw new Error("ZIP entry is too large");
    if (view.getUint32(entry.offset, true) !== 0x04034b50) throw new Error("Broken ZIP entry");
    const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
    const data = bytes.subarray(start, start + entry.compressedSize);
    if (entry.method === 0) return decoder.decode(data);
    if (entry.method === 8) return decoder.decode(await inflate(data, entry.size));
    throw new Error("Unsupported ZIP compression");
  };
}

function parseXml(text) {
  const xml = new DOMParser().parseFromString(text, "application/xml");
  if (xml.getElementsByTagName("parsererror").length) throw new Error("Invalid XML");
  return xml;
}

// Namespace-agnostic lookup, so files that write prefixed tags such as <x:c> still parse.
const elements = (node, name) => [...node.getElementsByTagNameNS("*", name)];

function richText(node) {
  if (!node) return "";
  // Skip <rPh> phonetic hints that some editors store beside East Asian text.
  return elements(node, "t").filter((t) => t.parentNode.localName !== "rPh").map((t) => t.textContent).join("");
}

function columnIndex(reference) {
  const letters = /^[A-Z]+/i.exec(reference ?? "")?.[0];
  if (!letters) return;
  return [...letters.toUpperCase()].reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function cellText(cell, sharedStrings) {
  const type = cell.getAttribute("t");
  if (type === "s") return sharedStrings[Number(elements(cell, "v")[0]?.textContent)] ?? "";
  if (type === "inlineStr") return richText(elements(cell, "is")[0]);
  return elements(cell, "v")[0]?.textContent ?? "";
}

function cleanText(text) {
  return text
    .replace(/_x([0-9a-f]{4})_/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\r\n?/g, "\n");
}

// Returns the first worksheet as rows of strings. Missing cells become "".
export async function readWorkbook(file) {
  const read = openZip(await file.arrayBuffer());
  const workbook = await read("xl/workbook.xml");
  if (!workbook) throw new Error("Not an .xlsx workbook");
  const firstSheet = elements(parseXml(workbook), "sheet")[0];
  // r:id can use the transitional or the strict relationship namespace.
  const relationId = [...(firstSheet?.attributes ?? [])].find((attribute) => attribute.localName === "id")?.value;
  const relations = await read("xl/_rels/workbook.xml.rels");
  const target = relations && elements(parseXml(relations), "Relationship")
    .find((relation) => relation.getAttribute("Id") === relationId)?.getAttribute("Target");
  // Targets are relative to xl/ unless they start with "/".
  const sheetPath = target ? decodeURIComponent(new URL(target, "file:///xl/").pathname.slice(1)) : "xl/worksheets/sheet1.xml";
  const sheet = await read(sheetPath);
  if (!sheet) throw new Error("Worksheet is missing");
  const shared = await read("xl/sharedStrings.xml");
  const sharedStrings = shared ? elements(parseXml(shared), "si").map(richText) : [];

  return elements(parseXml(sheet), "row").map((row) => {
    const values = [];
    for (const cell of elements(row, "c")) {
      values[columnIndex(cell.getAttribute("r")) ?? values.length] = cleanText(cellText(cell, sharedStrings));
    }
    return Array.from(values, (value) => value ?? "");
  });
}

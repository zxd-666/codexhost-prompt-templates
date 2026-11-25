function scrollParent(list) {
  const doc = list.ownerDocument;
  const win = doc.defaultView;
  for (let node = list.parentElement; node; node = node.parentElement ?? node.getRootNode().host) {
    const scrollable = /^(auto|scroll)$/.test(win.getComputedStyle(node).overflowY);
    if (scrollable && node.scrollHeight > node.clientHeight) return node;
  }
  return doc.scrollingElement;
}

export function bindReorder(list, signal, move) {
  const doc = list.ownerDocument;
  const win = doc.defaultView;
  const listen = (type, handler) => list.addEventListener(type, handler, { signal });
  let drag;
  let frame = 0;
  let drop;

  function mark(next) {
    if (drop?.row === next?.row && drop?.position === next?.position) return;
    drop?.row.removeAttribute("data-drop-position");
    drop = next;
    if (drop) drop.row.dataset.dropPosition = drop.position;
  }

  function cancel() {
    if (!drag) return;
    const { handle, row, pointerId } = drag;
    drag = undefined;
    mark(undefined);
    row.removeAttribute("data-dragging");
    win.cancelAnimationFrame(frame);
    frame = 0;
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
  }

  function viewport() {
    if (!drag.scroller || drag.scroller === doc.scrollingElement) return { top: 0, bottom: win.innerHeight };
    const box = drag.scroller.getBoundingClientRect();
    return { top: Math.max(0, box.top), bottom: Math.min(win.innerHeight, box.bottom) };
  }

  function locate() {
    const bounds = list.getBoundingClientRect();
    const { top, bottom } = viewport();
    if (drag.x < bounds.left || drag.x > bounds.right || drag.y < top || drag.y > bottom) {
      mark(undefined);
      return;
    }
    const row = drag.rows.find((item) => drag.y < item.getBoundingClientRect().bottom) ?? drag.rows.at(-1);
    const box = row.getBoundingClientRect();
    const position = drag.y < box.top + box.height / 2 ? "before" : "after";
    const neighbor = position === "before" ? row.previousElementSibling : row.nextElementSibling;
    mark(row === drag.row || neighbor === drag.row ? undefined : { row, position });
  }

  function scroll() {
    frame = 0;
    if (!drag?.started || !drag.scroller) return;
    const { top, bottom } = viewport();
    if (drag.y < top || drag.y > bottom) return;
    const edge = Math.min(48, (bottom - top) / 3);
    const above = Math.max(0, top + edge - drag.y);
    const below = Math.max(0, drag.y - bottom + edge);
    const speed = Math.round((below - above) / 4);
    if (!speed) return;
    const previous = drag.scroller.scrollTop;
    drag.scroller.scrollTop += speed;
    if (previous === drag.scroller.scrollTop) return;
    locate();
    frame = win.requestAnimationFrame(scroll);
  }

  function request(from, to, position, keyboard = false) {
    move({ fromId: from.dataset.templateId, toId: to.dataset.templateId, position }, keyboard);
  }

  listen("pointerdown", (event) => {
    const handle = event.target.closest("[data-reorder-handle]");
    if (drag || !event.isPrimary || event.button !== 0 || !handle || handle.disabled) return;
    drag = {
      handle,
      row: handle.closest("li"),
      rows: [...list.children],
      scroller: scrollParent(list),
      pointerId: event.pointerId,
      startY: event.clientY,
      started: false,
    };
    handle.setPointerCapture(event.pointerId);
  });

  listen("pointermove", (event) => {
    if (drag?.pointerId !== event.pointerId) return;
    if (!drag.started && Math.abs(drag.startY - event.clientY) < 5) return;
    drag.started = true;
    drag.row.dataset.dragging = "";
    drag.x = event.clientX;
    drag.y = event.clientY;
    locate();
    if (!frame) frame = win.requestAnimationFrame(scroll);
  });

  listen("pointerup", (event) => {
    if (drag?.pointerId !== event.pointerId) return;
    if (drag.started) {
      drag.x = event.clientX;
      drag.y = event.clientY;
      locate();
    }
    const from = drag.row;
    const target = drop;
    cancel();
    if (target) request(from, target.row, target.position);
  });

  for (const event of ["pointercancel", "lostpointercapture"]) {
    listen(event, (event) => { if (drag?.pointerId === event.pointerId) cancel(); });
  }
  doc.addEventListener("keydown", (event) => {
    if (drag && event.key === "Escape") cancel();
  }, { signal });
  listen("keydown", (event) => {
    const handle = event.target.closest("[data-reorder-handle]");
    if (!handle || handle.disabled || event.isComposing) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    event.stopPropagation();
    const row = handle.closest("li");
    const up = event.key === "ArrowUp";
    const next = up ? row.previousElementSibling : row.nextElementSibling;
    if (next) request(row, next, up ? "before" : "after", true);
  });
  signal.addEventListener("abort", cancel, { once: true });
  return cancel;
}

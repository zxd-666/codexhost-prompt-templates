const presets = [
  {
    id: "review",
    zh: ["审查改动", "代码 · 验收", "请审查当前改动，优先检查行为回归、边界条件和测试遗漏。按严重程度列出问题，附文件位置、复现条件和建议修复。"],
    en: ["Review changes", "Code · Verification", "Review the current changes for regressions, edge cases, and missing tests. List findings by severity with file locations, reproduction conditions, and suggested fixes."],
  },
  {
    id: "clarify",
    zh: ["梳理需求", "产品 · 需求", "请把以下需求整理成目标、使用场景、范围和验收标准。将已知事实与待确认项分开，并列出会影响方案选择的问题。"],
    en: ["Clarify a requirement", "Product · Requirements", "Organize the requirement below into goals, use cases, scope, and acceptance criteria. Separate confirmed facts from open questions and flag any decision that would change the approach."],
  },
  {
    id: "handoff",
    zh: ["整理交接", "协作 · 总结", "请整理当前工作的交接说明，包含已完成的事项、实际验证结果、相关文件和待解决问题。标明仍需确认的结论。"],
    en: ["Summarize a handoff", "Collaboration · Summary", "Prepare a handoff covering completed work, verification results, relevant files, and open issues. Mark conclusions that still need confirmation."],
  },
];

export const language = (locale) => /^zh(?:-|$)/i.test(locale) ? "zh" : "en";

export function newTemplateId() {
  const hex = Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)),
    (part) => part.toString(16).padStart(8, "0")).join("");
  return `custom:${hex}`;
}

export function customTemplates(settings) {
  if (!Array.isArray(settings.templates)) return [];
  return settings.templates.filter((item) => item && typeof item.id === "string" &&
    typeof item.title === "string" && typeof item.tags === "string" && typeof item.body === "string");
}

// Two templates count as duplicates when their visible text matches, ignoring outer whitespace.
export function templateKey({ title, tags, body }) {
  return JSON.stringify([title.trim(), tags.trim(), body.replace(/\r\n?/g, "\n").trim()]);
}

export function orderedTemplates(settings, locale) {
  const builtIns = presets.map((item) => {
    const [title, tags, body] = item[language(locale)];
    return { id: `preset:${item.id}`, title, tags, body, preset: true };
  });
  const templates = [...customTemplates(settings), ...builtIns];
  if (!Array.isArray(settings.templateOrder)) return templates;

  const remaining = new Map(templates.map((template) => [template.id, template]));
  const ordered = [];
  for (const id of settings.templateOrder) {
    const template = remaining.get(id);
    if (template) {
      ordered.push(template);
      remaining.delete(id);
    }
  }
  return [...ordered, ...remaining.values()];
}

export function templateTags(value) {
  const tags = new Map();
  for (const part of value.split(/[,，、;；·\r\n]+/u)) {
    const label = part.trim();
    if (!label) continue;
    const key = label.toLowerCase().normalize("NFC");
    if (!tags.has(key)) tags.set(key, { key, label });
  }
  return [...tags.values()];
}

export function templateList(settings, locale, query = "", tag = "") {
  const terms = query.trim().toLowerCase().split(/\s+/);
  return orderedTemplates(settings, locale).filter(({ title, tags, body, preset }) => {
    if (preset && settings.showPresets === false) return false;
    if (tag && !templateTags(tags).some(({ key }) => key === tag)) return false;
    const haystack = `${title}\n${tags}\n${body}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function watchSettings(api, onChange, onError) {
  let changed = false;
  const stop = api.storage.onChange((values) => {
    changed = true;
    if (!api.signal.aborted) onChange(values);
  });
  api.storage.get().then((values) => {
    if (!changed && !api.signal.aborted) onChange(values);
  }).catch(() => {
    if (!changed && !api.signal.aborted) onError();
  });
  return stop;
}

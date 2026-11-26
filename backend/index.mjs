import { customTemplates, orderedTemplates, templateList } from "../shared/library.mjs";

function validTemplate(template) {
  return template && typeof template.id === "string" && /^custom:[a-f0-9-]{32,36}$/.test(template.id) &&
    typeof template.title === "string" && template.title.trim().length > 0 && template.title.length <= 100 &&
    typeof template.tags === "string" && template.tags.length <= 180 &&
    typeof template.body === "string" && template.body.trim().length > 0 && template.body.length <= 20000;
}

function matches(a, b) {
  return a && b && a.id === b.id && a.title === b.title && a.tags === b.tags && a.body === b.body;
}

function reorder(settings, { fromId, toId, position, locale, query, tag = "" }) {
  if (typeof locale !== "string" || typeof query !== "string" || typeof tag !== "string" ||
      (position !== "before" && position !== "after")) throw new Error("Invalid template order");

  const current = templateList(settings, locale, query, tag).map(({ id }) => id);
  if (!current.includes(fromId) || !current.includes(toId) || fromId === toId) return;
  const moved = current.filter((id) => id !== fromId);
  const target = moved.indexOf(toId) + (position === "after" ? 1 : 0);
  moved.splice(target, 0, fromId);

  // Only the slots occupied by the filtered list change. Hidden entries keep their places.
  const visible = new Set(current);
  let index = 0;
  return orderedTemplates(settings, locale).map(({ id }) => visible.has(id) ? moved[index++] : id);
}

export function activate(ctx) {
  let pending = Promise.resolve();
  ctx.handle("changeLibrary", (request) => {
    // One queue in the shared Host serializes changes from Desktop and Web.
    const result = pending.then(async () => {
      const settings = await ctx.readSettings();
      switch (request?.action) {
        case "presets": {
          if (typeof request.showPresets !== "boolean") throw new Error("Invalid template preference");
          await ctx.writeSettings({ ...settings, showPresets: request.showPresets });
          return true;
        }
        case "reorder": {
          const templateOrder = reorder(settings, request);
          if (!templateOrder) return false;
          await ctx.writeSettings({ ...settings, templateOrder });
          return true;
        }
        case "save": {
          const { template, previous } = request;
          if (!validTemplate(template)) throw new Error("Invalid template");
          const templates = customTemplates(settings);
          const existing = templates.find(({ id }) => id === template.id);
          if (!previous && existing) return matches(existing, template);
          if (previous && !matches(existing, previous)) return false;
          const next = existing ? templates.map((item) => item.id === template.id ? template : item) : [template, ...templates];
          const values = { ...settings, templates: next };
          if (!existing && Array.isArray(settings.templateOrder)) {
            values.templateOrder = [template.id, ...settings.templateOrder];
          }
          await ctx.writeSettings(values);
          return true;
        }
        case "remove": {
          const { previous } = request;
          const templates = customTemplates(settings);
          if (!matches(templates.find(({ id }) => id === previous?.id), previous)) return false;
          const values = { ...settings, templates: templates.filter(({ id }) => id !== previous.id) };
          if (Array.isArray(settings.templateOrder)) {
            values.templateOrder = settings.templateOrder.filter((id) => id !== previous.id);
          }
          await ctx.writeSettings(values);
          return true;
        }
        default:
          throw new Error("Unknown template action");
      }
    });
    pending = result.catch(() => {});
    return result;
  });
}

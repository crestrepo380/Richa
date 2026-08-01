/**
 * Email template rendering. Pure and framework-free so it is unit-tested and
 * shared by the reminder job, the preview in the template editor, and any
 * future announcement/promo send.
 *
 * Templates use `{{variable}}` tokens. Rendering is intentionally NOT a general
 * expression engine — only known variable names are substituted, unknown tokens
 * are left visible (so a typo shows up in a test send rather than silently
 * vanishing), and values are HTML-escaped when rendering the HTML body to
 * prevent injection from a variable value.
 */

const TOKEN = /\{\{\s*([\w.]+)\s*\}\}/g;

export type TemplateVars = Record<string, string | number | null | undefined>;

/** Every distinct variable referenced by a template body/subject. */
export function extractVariables(...sources: string[]): string[] {
  const found = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(TOKEN)) {
      found.add(match[1]);
    }
  }
  return [...found];
}

/** Plain-text render (subjects, text body). Unknown tokens are left intact. */
export function renderText(template: string, vars: TemplateVars): string {
  return template.replace(TOKEN, (whole, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? whole : String(value);
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * HTML render. Variable values are escaped; the template text itself is trusted
 * (authored by a super-admin). Newlines become <br> so plain-text-style bodies
 * render sensibly in email clients.
 */
export function renderHtml(template: string, vars: TemplateVars): string {
  const substituted = template.replace(TOKEN, (whole, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? whole : escapeHtml(String(value));
  });
  return substituted.replace(/\n/g, "<br>\n");
}

/** Which referenced variables have no value supplied — for editor warnings. */
export function missingVariables(template: string, vars: TemplateVars): string[] {
  return extractVariables(template).filter(
    (name) => vars[name] === undefined || vars[name] === null,
  );
}

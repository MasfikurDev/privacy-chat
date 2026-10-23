// Static UI guardrails. Runs as part of `npm run build` so regressions fail early.
// Rules protect the strict Content-Security-Policy, the design tokens and basic accessibility.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const problems = [];
const fail = (file, message) => problems.push(`${file}: ${message}`);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

// Remove every `:root { ... }` block. Raw colours are only allowed there (design tokens).
function stripRootBlocks(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf(':root', i);
    if (at === -1) {
      out += css.slice(i);
      break;
    }
    out += css.slice(i, at);
    let depth = 1;
    let j = css.indexOf('{', at) + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    i = j;
  }
  return out;
}

const isHex = (c) => '0123456789abcdefABCDEF'.includes(c);
function hasHexColour(text) {
  let at = text.indexOf('#');
  while (at !== -1) {
    let n = 0;
    while (n < 8 && isHex(text[at + 1 + n] ?? '')) n++;
    const next = text[at + 1 + n] ?? '';
    const wordChar = next !== '' && (isHex(next) || /[a-zA-Z0-9_-]/.test(next));
    if ((n === 3 || n === 4 || n === 6 || n === 8) && !wordChar) return true;
    at = text.indexOf('#', at + 1);
  }
  return false;
}

const files = walk('src');

for (const file of files.filter((f) => f.endsWith('.css'))) {
  const css = readFileSync(file, 'utf8');
  if (css.includes('!important')) fail(file, 'avoid !important; fix the specificity instead');
  if (css.includes('http://') || css.includes('https://')) fail(file, 'no external URLs (CSP allows same-origin only)');
  const body = stripRootBlocks(css);
  if (hasHexColour(body) || ['rgb(', 'rgba(', 'hsl(', 'hsla('].some((f) => body.includes(f))) {
    fail(file, 'raw colour outside :root; add or reuse a design token (see docs/ui-guide.md)');
  }
}

for (const file of files.filter((f) => f.endsWith('.tsx'))) {
  const src = readFileSync(file, 'utf8');
  if (src.includes("style='") || src.includes('style="')) fail(file, 'inline style attributes are blocked by the CSP; use a class instead');
  if (src.includes('style={{')) fail(file, 'inline style objects may be blocked by the CSP; use a CSS class instead');
  if (src.includes('dangerouslySetInnerHTML') || src.includes('innerHTML')) fail(file, 'never inject HTML; render text through JSX');
  if (src.includes('http://') || src.includes('https://')) fail(file, 'no external URLs in components');
  let at = src.indexOf('<img');
  while (at !== -1) {
    const end = src.indexOf('>', at);
    if (!src.slice(at, end).includes('alt=')) fail(file, '<img> needs an alt attribute (use an empty alt for decorative images)');
    at = src.indexOf('<img', at + 1);
  }
}

const html = readFileSync('index.html', 'utf8');
if (!html.includes('name="viewport"')) fail('index.html', 'missing viewport meta tag');
if (!html.includes('lang=')) fail('index.html', 'missing lang attribute on <html>');
if (html.includes('src="http') || html.includes('href="http')) fail('index.html', 'no external scripts, styles or fonts');

if (problems.length > 0) {
  console.error('UI checks failed:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log(`UI checks passed (${files.length} source files).`);

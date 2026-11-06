import { fail } from './schema.mjs';

export async function unique(page, selector, { absent = false } = {}) {
  const target = page.locator(selector);
  const count = await target.count();
  if (count > 1) fail('ambiguous_selector');
  if (!count && !absent) fail('missing_selector');
  return target;
}
// Locator is re-resolved on every sample; remounts never retain ElementHandles.
async function eventually(check, timeout) {
  const end = Date.now() + timeout;
  do {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  } while (Date.now() < end);
  fail('assertion_mismatch');
}
export async function runStep(page, step, { baseUrl, timeout = 7500, screenshot }) {
  const limit = Math.min(step.timeout ?? timeout, timeout);
  const target = () => unique(page, step.selector);
  switch (step.action) {
    case 'goto': await page.goto(new URL(step.url || '/', baseUrl).href, { waitUntil: step.waitUntil ?? 'domcontentloaded', timeout: limit }); break;
    case 'click': await (await target()).click({ timeout: limit }); break;
    case 'fill': await (await target()).fill(String(step.value ?? ''), { timeout: limit }); break;
    case 'press':
      if (step.selector) await (await target()).press(step.key, { timeout: limit });
      else await page.keyboard.press(step.key);
      break;
    case 'wait': {
      const loc = page.locator(step.selector);
      // Attached/visible waits permit a lifecycle remount, not ambiguous targets.
      await loc.waitFor({ state: step.state ?? 'visible', timeout: limit });
      await unique(page, step.selector, { absent: ['hidden', 'detached'].includes(step.state) });
      break;
    }
    case 'checkVisible': await (await target()).waitFor({ state: 'visible', timeout: limit }); break;
    case 'checkHidden': {
      const loc = await unique(page, step.selector, { absent: true });
      await loc.waitFor({ state: 'hidden', timeout: limit }); break;
    }
    case 'checkCount': await eventually(async () => (await page.locator(step.selector).count()) === step.count, limit); break;
    case 'checkText': await eventually(async () => ((await (await target()).textContent()) ?? '').includes(step.text), limit); break;
    case 'checkFocused': await eventually(async () => (await target()).evaluate(el => el === document.activeElement), limit); break;
    case 'checkAttribute': await eventually(async () => (await (await target()).getAttribute(step.name)) === step.value, limit); break;
    case 'scroll': {
      const loc = await target();
      if (step.intoView) await loc.scrollIntoViewIfNeeded({ timeout: limit });
      else await loc.evaluate((el, s) => el.scrollTo(s.x ?? 0, s.y ?? 0), step);
      break;
    }
    case 'checkGeometry': {
      const geometry = await (await target()).evaluate((el, s) => {
        const r = el.getBoundingClientRect();
        const visible = r.width > 0 && r.height > 0 && getComputedStyle(el).visibility === 'visible';
        let unclipped = visible;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const cs = getComputedStyle(p), b = p.getBoundingClientRect();
          const x = b.left + p.clientLeft, y = b.top + p.clientTop;
          if (cs.overflowX !== 'visible' && (r.left < x - 1 || r.right > x + p.clientWidth + 1)) unclipped = false;
          if (cs.overflowY !== 'visible' && (r.top < y - 1 || r.bottom > y + p.clientHeight + 1)) unclipped = false;
        }
        const inViewport = visible && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
        return visible && (!s.noOverflow || (el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)) &&
          (!s.unclipped || unclipped) && (!s.inViewport || inViewport) &&
          (!s.focusedInViewport || (inViewport && el === document.activeElement));
      }, step);
      if (!geometry) fail('geometry_mismatch');
      break;
    }
    case 'checkContrast': {
      const loc = await target();
      await loc.scrollIntoViewIfNeeded({ timeout: limit });
      if (step.state === 'hover') await loc.hover({ timeout: limit });
      else if (step.state === 'focus') await loc.focus({ timeout: limit });
      else if ((step.state ?? 'normal') === 'normal') {
        await page.mouse.move(0, 0);
        await loc.evaluate(el => { if (el === document.activeElement) el.blur(); });
      }
      const data = await loc.evaluate(computedContrast, step);
      if (data.unsupported) fail('contrast_unsupported');
      if (!data.applicable) fail('contrast_state_or_size_mismatch');
      if (data.ratio < step.threshold) fail('contrast_below_threshold');
      return { ratio: Number(data.ratio.toFixed(4)), threshold: step.threshold };
    }
    case 'screenshot': await screenshot(); break;
    default: fail('unknown_action');
  }
  return {};
}

// Executed in Chromium, with computed values, not scenario-supplied colors.
function computedContrast(el, step) {
  const parse = value => {
    const m = value.match(/^rgba?\(([^)]+)\)$/);
    if (!m) return null;
    const n = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return n.length >= 3 && n.every(Number.isFinite) ? [n[0], n[1], n[2], n[3] ?? 1] : null;
  };
  const blend = (f, b) => f.slice(0, 3).map((v, i) => v * f[3] + b[i] * (1 - f[3])).concat(1);
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const stack = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  // Sibling/overlay paint cannot be reconstructed by ancestor alpha compositing.
  if (!stack.includes(el) || stack.some(node => !node.contains(el) && !el.contains(node))) return { unsupported: true };
  for (const pseudo of ['::before', '::after']) {
    const style = getComputedStyle(el, pseudo);
    if (style.content !== 'none' && style.content !== 'normal') return { unsupported: true };
  }
  let applicable = (step.state !== 'error' || el.getAttribute('aria-invalid') === 'true' || el.dataset.state === 'error');
  if (step.kind === 'largeText') applicable &&= parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.666 && Number(cs.fontWeight) >= 700);
  const nodes = [];
  for (let p = el; p; p = p.parentElement) {
    const s = getComputedStyle(p);
    if (s.backgroundImage !== 'none' || Number(s.opacity) !== 1 || s.filter !== 'none' || s.mixBlendMode !== 'normal' || (s.backdropFilter && s.backdropFilter !== 'none')) return { unsupported: true };
    nodes.unshift(p);
  }
  // Default browser canvas is opaque white. Composite all alpha backgrounds in paint order.
  let bg = [255, 255, 255, 1];
  for (const node of nodes) {
    if (node === el && step.kind === 'ui') continue;
    const color = parse(getComputedStyle(node).backgroundColor);
    if (!color) return { unsupported: true };
    bg = blend(color, bg);
  }
  const fg = parse(cs[step.kind === 'ui' ? step.property : 'color']);
  if (!fg || cs.visibility !== 'visible' || !el.getClientRects().length) return { unsupported: true };
  const rgb = blend(fg, bg);
  const lum = c => c.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((v, n, i) => v + n * [.2126, .7152, .0722][i], 0);
  const a = lum(rgb), b = lum(bg);
  return { applicable, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
}

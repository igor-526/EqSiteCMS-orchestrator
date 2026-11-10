export const CONTRAST_UNSUPPORTED_REASONS = Object.freeze([
  'color-format', 'background-image', 'opacity', 'filter-or-blend', 'pseudo-paint', 'overlap', 'not-visible',
]);
export function contrastUnsupported(reason) {
  const error = new CheckError('contrast_unsupported');
  if (CONTRAST_UNSUPPORTED_REASONS.includes(reason)) error.unsupportedReason = reason;
  return error;
}
// Pure validation: no browser, filesystem or process side effects.
export class CheckError extends Error {
  constructor(code) { super(code); this.code = code; }
}
export const fail = (code) => { throw new CheckError(code); };
const id = (s) => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/.test(s);
const positive = (n, max) => Number.isInteger(n) && n > 0 && n <= max;
const nonempty = (s) => typeof s === 'string' && s.trim().length > 0;
const actions = new Set(['goto', 'click', 'fill', 'wait', 'press', 'checkVisible', 'checkText', 'screenshot',
  'checkHidden', 'checkCount', 'checkFocused', 'checkAttribute', 'checkGeometry', 'scroll', 'checkContrast']);
export function scopeValid(scope) {
  if (!scope || !Array.isArray(scope.include) || !scope.include.length || !scope.include.every(nonempty)) fail('axe_scope_required');
  if (scope.exclude !== undefined && (!Array.isArray(scope.exclude) || !scope.exclude.every(e => nonempty(e.selector) && nonempty(e.reason)))) fail('axe_exclude_reason_required');
}
export function validateStep(s) {
  if (!s || !actions.has(s.action)) fail('unknown_action');
  if (s.id !== undefined && !id(s.id)) fail('invalid_step_id');
  if (s.timeout !== undefined && !positive(s.timeout, 120000)) fail('invalid_step_timeout');
  if (!['goto', 'press', 'screenshot'].includes(s.action) && !nonempty(s.selector)) fail('selector_required');
  if (s.selector !== undefined && !nonempty(s.selector)) fail('selector_required');
  if (s.action === 'press' && !nonempty(s.key)) fail('key_required');
  if (s.action === 'checkCount' && (!Number.isInteger(s.count) || s.count < 0)) fail('invalid_count');
  if (s.action === 'checkAttribute' && (!nonempty(s.name) || !(typeof s.value === 'string' || s.value === null))) fail('invalid_attribute');
  if (s.action === 'checkText' && typeof s.text !== 'string') fail('invalid_text');
  if (s.action === 'wait' && s.state !== undefined && !['attached', 'detached', 'visible', 'hidden'].includes(s.state)) fail('invalid_wait_state');
  if (s.action === 'checkGeometry') {
    const keys = ['noOverflow', 'unclipped', 'inViewport', 'focusedInViewport'];
    if (!keys.some(k => s[k] === true) || keys.some(k => s[k] !== undefined && typeof s[k] !== 'boolean')) fail('geometry_expectation_required');
  }
  if (s.action === 'scroll' && (![s.x ?? 0, s.y ?? 0].every(Number.isFinite))) fail('invalid_scroll');
  if (s.action === 'checkContrast') {
    const floor = { text: 4.5, largeText: 3, ui: 3 }[s.kind ?? 'text'];
    if (!floor || !Number.isFinite(s.threshold) || s.threshold < floor || s.threshold > 21) fail('invalid_contrast_threshold');
    if (!['normal', 'hover', 'focus', 'error'].includes(s.state ?? 'normal')) fail('invalid_contrast_state');
    if (s.kind === 'ui' && !['backgroundColor', 'borderTopColor'].includes(s.property)) fail('contrast_ui_property_required');
  }
}
export function selectScenarios(definition, options = {}) {
  const { mode = 'qg', scenarioIds, maxScenarios = 50, timeoutMs = 120000, service = 'frontend', viewports = ['desktop'] } = options;
  if (!['qg', 'self-check'].includes(mode)) fail('invalid_mode');
  if (!positive(timeoutMs, 120000) || !positive(maxScenarios, 100)) fail('invalid_budget');
  if (service !== 'frontend' && !/^site-[a-z0-9-]+$/.test(service)) fail('invalid_service');
  if (!viewports.length || viewports.some(v => !['desktop', 'tablet', 'mobile'].includes(v))) fail('invalid_viewport');
  if (service === 'frontend' && (viewports.length !== 1 || viewports[0] !== 'desktop')) fail('cms_desktop_only');
  if (![undefined, 1, 2].includes(definition.schemaVersion)) fail('unsupported_schema');
  if (!Array.isArray(definition.scenarios) || !definition.scenarios.length) fail('empty_scenarios');
  const seen = new Set();
  for (const s of definition.scenarios) {
    if (!id(s.id) || seen.has(s.id)) fail('invalid_scenario_id');
    seen.add(s.id);
    if (typeof s.url !== 'string' || !Array.isArray(s.steps) || !s.steps.length) fail('invalid_scenario');
    if (definition.schemaVersion === 2 && (!id(s.riskId) || !Array.isArray(s.prerequisites) || !s.expected || typeof s.expected !== 'object' || !s.evidencePolicy)) fail('invalid_v2_scenario');
    if (s.timeout !== undefined && !positive(s.timeout, 120000)) fail('invalid_scenario_timeout');
    if (s.axeScope) scopeValid(s.axeScope);
    else if (definition.schemaVersion === 2) fail('axe_scope_required');
    if (s.evidencePolicy?.screenshot && !nonempty(s.evidencePolicy.screenshot.selector)) fail('safe_fragment_required');
    if (s.evidencePolicy?.screenshot?.mask !== undefined && (!Array.isArray(s.evidencePolicy.screenshot.mask) || !s.evidencePolicy.screenshot.mask.every(nonempty))) fail('invalid_mask');
    s.steps.forEach(validateStep);
  }
  const ids = typeof scenarioIds === 'string' ? scenarioIds.split(',').map(s => s.trim()) : scenarioIds;
  if ((mode === 'self-check' && !ids) || (ids && (!Array.isArray(ids) || !ids.length || ids.some(x => !id(x) || !seen.has(x)) || new Set(ids).size !== ids.length))) fail('invalid_selection');
  const selected = ids ? ids.map(key => definition.scenarios.find(s => s.id === key)) : definition.scenarios;
  if (!selected.length || selected.length * viewports.length > maxScenarios) fail('scenario_budget_exceeded');
  return selected;
}
export function safeUrl(value) {
  try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? `${u.origin}${u.pathname}` : null; } catch { return null; }
}

export function scenario(id, steps, { url = '/good', riskId = 'BR-01', ...extra } = {}) {
  return {
    id, riskId, url, prerequisites: ['synthetic Chromium'], steps, expected: {},
    axeScope: { include: ['#surface'], exclude: [{ selector: '#outside', reason: 'Deliberately invalid image tests scope isolation' }] },
    evidencePolicy: {}, ...extra,
  };
}
export const definition = scenarios => ({ schemaVersion: 2, scenarios });
export const keyboardSteps = [
  { action: 'press', key: 'Tab' }, { action: 'checkFocused', selector: '#open' },
  { action: 'press', key: 'Enter' }, { action: 'checkVisible', selector: '#wizard' },
  { action: 'checkFocused', selector: '#confirmTrigger' },
  { action: 'press', key: 'Tab' }, { action: 'checkFocused', selector: '#cancelWizard' },
  { action: 'press', key: 'Shift+Tab' }, { action: 'checkFocused', selector: '#confirmTrigger' },
  { action: 'press', key: 'Space' }, { action: 'checkVisible', selector: '#confirm' },
  { action: 'checkFocused', selector: '#save' },
  { action: 'press', key: 'Escape' },
];
export function nested(id = 'nested', pending = false, url = pending ? '/pending' : '/good') {
  return scenario(id, [...keyboardSteps,
    { action: 'checkVisible', selector: '#wizard' },
    { action: pending ? 'checkVisible' : 'checkHidden', selector: '#confirm' },
    { action: 'checkAttribute', selector: '#confirm', name: 'data-pending', value: String(pending) },
    { action: 'checkFocused', selector: pending ? '#save' : '#confirmTrigger' },
    ...pending ? [] : [{ action: 'press', key: 'Escape' }, { action: 'checkHidden', selector: '#wizard' }, { action: 'checkFocused', selector: '#open' }],
  ], { url });
}
export const goodScenarios = [nested(), nested('pending', true),
  scenario('remount', [
    { action: 'checkHidden', selector: '#sizing' }, { action: 'checkCount', selector: 'table', count: 2 },
    { action: 'click', selector: '#sort' }, { action: 'checkAttribute', selector: '#table', name: 'data-sort', value: 'asc' },
    { action: 'checkText', selector: '#table td', text: 'Alpha' },
    { action: 'checkAttribute', selector: '#table', name: 'data-offset', value: '0' },
    { action: 'click', selector: '#size' }, { action: 'press', key: 'ArrowDown' }, { action: 'press', key: 'Enter' },
    { action: 'checkAttribute', selector: '#table', name: 'data-limit', value: '20' },
    { action: 'checkAttribute', selector: '#table', name: 'data-offset', value: '0' },
  ]),
  scenario('geometry', [
    { action: 'checkGeometry', selector: '#toolbar', noOverflow: true, unclipped: true, inViewport: true },
    { action: 'checkGeometry', selector: '#error', noOverflow: true },
    { action: 'checkGeometry', selector: '#clipText', unclipped: true },
    { action: 'scroll', selector: '#scrollbox', y: 240 },
    { action: 'click', selector: '#scrolltarget' },
    { action: 'checkGeometry', selector: '#scrolltarget', unclipped: true, focusedInViewport: true },
  ], { riskId: 'BR-02' }),
  scenario('contrast', [
    ...['normal', 'hover', 'focus'].map(state => ({ action: 'checkContrast', selector: '#contrast', threshold: 4.5, state })),
    { action: 'checkContrast', selector: '#alpha', threshold: 4.5 },
    { action: 'checkContrast', selector: '#boundary', kind: 'ui', property: 'backgroundColor', threshold: 3 },
  ], { riskId: 'BR-02' }),
];

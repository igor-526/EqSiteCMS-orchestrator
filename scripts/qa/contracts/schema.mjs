import { ADAPTERS } from './registry.mjs';

export class ContractError extends Error {
  constructor(code) { super(code); this.code = code; }
}
export function requireThat(ok, code = 'invalid-schema') { if (!ok) throw new ContractError(code); }
export function keys(value, required, optional = []) {
  requireThat(value && typeof value === 'object' && !Array.isArray(value));
  requireThat(required.every(k => Object.hasOwn(value, k)) && Object.keys(value).every(k => [...required, ...optional].includes(k)));
}
export const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/.test(value);
export function observation(value) {
  keys(value, ['accepted', 'storageEffects', 'disposition']);
  requireThat(typeof value.accepted === 'boolean' && Number.isSafeInteger(value.storageEffects) && value.storageEffects >= 0);
  requireThat(['accepted', 'rejected', 'ack', 'nak', 'term', 'none'].includes(value.disposition));
  requireThat(value.accepted || value.storageEffects === 0, 'storage-before-validation');
}
export function validateManifest(m, selected) {
  keys(m, ['schemaVersion', 'mode', 'adapterId', 'producer', 'consumer', 'scenarios'], ['timeoutMs', 'maxBytes', 'suiteTimeoutMs']);
  requireThat(m.schemaVersion === 1 && ['synthetic', 'acceptance'].includes(m.mode));
  requireThat(Object.hasOwn(ADAPTERS, m.adapterId), 'unknown-adapter');
  const adapter = ADAPTERS[m.adapterId];
  requireThat(m.mode !== 'acceptance' || adapter.kind === 'production', 'synthetic-not-acceptance');
  for (const phase of ['producer', 'consumer']) {
    keys(m[phase], ['repo', 'python']);
    requireThat(m[phase].repo === adapter[phase], 'invalid-repo');
    requireThat(adapter.kind === 'synthetic' ? m[phase].python === 'python3' : m[phase].python === `${adapter[phase]}/.venv/bin/python`, 'invalid-interpreter');
  }
  for (const [field, fallback, max] of [['timeoutMs', 15000, 120000], ['maxBytes', 262144, 1048576], ['suiteTimeoutMs', 900000, 900000]]) {
    const n = m[field] ?? fallback;
    requireThat(Number.isSafeInteger(n) && n > 0 && n <= max);
  }
  requireThat(Array.isArray(m.scenarios) && m.scenarios.length > 0 && m.scenarios.length <= 100);
  for (const s of m.scenarios) {
    keys(s, ['id', 'case', 'expected']);
    requireThat(safeId(s.id) && safeId(s.case));
    observation(s.expected);
  }
  const ids = m.scenarios.map(s => s.id);
  requireThat(new Set(ids).size === ids.length, 'duplicate-scenario');
  requireThat(Array.isArray(selected) && selected.length > 0 && selected.every(safeId) && new Set(selected).size === selected.length, 'empty-or-invalid-selection');
  requireThat(selected.every(id => ids.includes(id)), 'missing-scenario');
  return adapter;
}
export function validateResponse(r, phase, id, protocol) {
  keys(r, ['schemaVersion', 'scenarioId', 'status', phase === 'producer' ? 'wire' : 'observed']);
  requireThat(r.schemaVersion === 1 && r.scenarioId === id && r.status === 'passed', 'adapter-failed-or-skipped');
  if (phase === 'consumer') { observation(r.observed); return; }
  if (protocol === 'http') {
    keys(r.wire, ['protocol', 'body']);
    requireThat(r.wire.protocol === 'http' && typeof r.wire.body === 'string');
    try { JSON.parse(r.wire.body); } catch { throw new ContractError('invalid-http-json'); }
  } else {
    keys(r.wire, ['protocol', 'dataBase64', 'headers']);
    requireThat(r.wire.protocol === 'nats' && typeof r.wire.dataBase64 === 'string' && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(r.wire.dataBase64));
    requireThat(r.wire.headers && typeof r.wire.headers === 'object' && !Array.isArray(r.wire.headers));
    requireThat(Object.entries(r.wire.headers).every(([k, v]) => k.length <= 128 && typeof v === 'string' && v.length <= 1024));
  }
}

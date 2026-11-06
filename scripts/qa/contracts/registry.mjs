// Trusted code, never populated from a manifest.
export const ADAPTERS = Object.freeze({
  'synthetic-http': { kind: 'synthetic', protocol: 'http', producer: '.', consumer: '.', module: 'scripts/qa/contracts/fixtures/patterns.py', callable: 'http_adapter' },
  'synthetic-nats': { kind: 'synthetic', protocol: 'nats', producer: '.', consumer: '.', module: 'scripts/qa/contracts/fixtures/patterns.py', callable: 'nats_adapter' },
  'yandex-seo-http': { kind: 'production', protocol: 'http', producer: 'services/yandex-service', consumer: 'services/seo-service', module: 'services/seo-service/tests/clients/test_yandex_lifecycle_contract.py', callable: 'wire_http_adapter' },
  'metrica-seo-nats': { kind: 'production', protocol: 'nats', producer: 'services/ya-metrica-service', consumer: 'services/seo-service', module: 'services/seo-service/tests/clients/test_yandex_lifecycle_contract.py', callable: 'wire_nats_adapter' },
});

# Изменения спецификации

## MODIFIED Requirements

### Requirement: SEO и доступ страницы лошадей
Список `/loshadi` и detail route SHALL иметь серверные route-specific title/description и canonical. Источники SEO и Public Read контракт `GET /api/horses` и `GET /api/horses/{slug_or_id}` MUST соответствовать сценарию «Источники SEO и матрица публичного доступа лошадей».

#### Scenario: Metadata доступна без hydration
- **WHEN** crawler получает HTML `/loshadi` или `/loshadi/[slug]` без выполнения клиентского JavaScript
- **THEN** HTML содержит route-specific title, description и canonical

#### Scenario: Анонимный доступ без tenant selector
- **WHEN** запрос к `GET /api/horses` или `GET /api/horses/{slug_or_id}` выполнен без `X-Equestrian-Service-Key` или с неверным значением
- **THEN** API возвращает `401`

#### Scenario: Источники SEO и матрица публичного доступа лошадей
- **WHEN** сайт формирует SEO списка или detail route лошади и обращается к соответствующему Public Read API
- **THEN** `/loshadi` SHALL иметь serverside title/description по `seo.horses.title`/`seo.horses.description` с fallback на заголовок страницы и default description, canonical `/loshadi`. Detail route SHALL формировать title/description из полей лошади (`name`, `pedigree_name`, `description`) и canonical на собственный slug-путь. `GET /api/horses` и `GET /api/horses/{slug_or_id}` SHALL оставаться Public Read.

| Method | Path | Access class | Роли | Без/с неверным selector | С корректным selector |
|---|---|---|---|---|---|
| `GET` | `/api/horses` | Public Read | нет | `401` | `200` |
| `GET` | `/api/horses/{slug_or_id}` | Public Read | нет | `401` | `200` своего tenant (при `this_stable=true`, применяется на стороне сайта); `404` чужого tenant/несуществующий |

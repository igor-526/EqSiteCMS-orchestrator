## Why

Нейтральный каркас `site-ksk-inlove` пока не имеет публичных маршрутов, брендовой UI-системы и общей навигационной оболочки, поэтому по нему нельзя последовательно реализовывать страницы из утверждённой схемы INLOVE. Нужен первый пользовательский слой: переиспользуемые компоненты, доступные заглушки всех маршрутов, общий header/footer и единая форма обратного звонка поверх уже существующего публичного callback-контракта.

После промежуточной приёмки исходная задача дополнена конкретным rework: текстовый бренд должен быть заменён статическим логотипом, три service routes — собраны в доступное меню «Услуги», footer — уплотнён и синхронизирован с header, а форма — перестать показывать и отправлять техническую информацию о странице. Эти замечания добавляются в тот же change без переписывания истории уже завершённых units.

## What Changes

- Реализовать в корневом `src/ui/` каталог foundations, atoms, controls, navigation, feedback, media, content cards и reusable sections согласно `components.md` и дизайн-протоколу INLOVE.
- Добавить семь маршрутов из неизменяемой карты сайта с SSR-заглушкой «раздел находится в разработке», уникальным `h1` и metadata.
- Подключить ко всем страницам общий SSR layout: header, mobile menu, footer и безопасные fallback при ошибке/неполноте `site_settings`.
- Реализовать универсальный callback modal, доступный из header и любого CTA, с Zod-валидацией, обязательным consent, focus management и отправкой через существующий anonymous `POST /api/callback_requests`.
- Зафиксировать responsive, accessibility, component/API-boundary и browser QA для ширин 320, 768, 1024 и 1440 px, включая длинный и пустой CMS-контент.
- Сохранить consumer boundary: публичные `GET` и callback exception выполняются без CMS credentials; новых backend endpoint, схемы БД и NATS-контрактов не добавляется.
- Выполнить промежуточный rework: перенести подтверждённый raster-logo из `docs/parsings/ksk.inlove/media/yandex/logo.jpg` в статику сайта и использовать его в header/footer; объединить «Занятия», «Прогулки» и «Постой» в dropdown «Услуги»; синхронизировать и уплотнить footer menu.
- Переименовать social label «ВКонтакте» в `VK`, переиспользовать для phone/VK/Instagram три icon glyph из уже реализованного `ContactSection` главной страницы и открывать все footer contact links в новой вкладке с безопасным `rel`.
- Удалить из callback UI и композиции `comment` строку текущей страницы, сохранив существующие DTO, endpoint и access contract.

## Capabilities

### New Capabilities

- `inlove-ui-components`: базовая дизайн-система и полный переиспользуемый каталог UI-компонентов INLOVE.
- `inlove-site-shell`: общий header/mobile navigation/footer, загрузка shared settings и их устойчивые fallback.
- `inlove-placeholder-pages`: семь публичных маршрутов с SSR-заглушками, metadata и общей оболочкой.
- `inlove-callback-form`: единая доступная форма обратного звонка с Zod-валидацией и существующим публичным POST-исключением.

### Modified Capabilities

- `inlove-site-skeleton`: вместо намеренного технического `404` каркас начинает обслуживать утверждённые пользовательские маршруты и получает презентационный UI-слой.

## Impact

- Основная зона изменений: `services/site-ksk-inlove/src/ui/**`, `src/app/**`, локальные feature/helper/tests и стили сайта.
- Rework-зона: `public/**`, `src/ui/atoms/**`, `src/ui/navigation/**`, точечно shared settings и `src/features/callBackRequest/**`; source image и homepage contact glyphs используются как read-only источники.
- Используются существующие `src/api/siteSettings.ts`, `src/api/callBackRequest.ts`, provider/types и `POST /api/callback_requests`; backend не меняется.
- Добавляется runtime-зависимость `zod` и, при необходимости текущего form stack, только локальные зависимости сайта.
- Локальная проверка использует уже переключённый gitignored `.env` с `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api`; deployment остаётся вне scope и запрещён текущим skeleton-контрактом.

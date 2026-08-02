# План: Редизайн и объединение модальных окон prices + кнопка дублирования записи

**Тикет:** prices_modal_redesign_and_duplicating
**Дата:** 2026-05-23
**Затронутые сервисы:** services/frontend
**Ветка:** feature/prices-modal-redesign-and-duplicating

---

## Контекст

В CMS существуют две отдельные модалки для работы с услугой цен:

- `PriceModal` — редактирует базовые поля (groups, name, description), ширина по умолчанию, отдельное открытие/закрытие.
- `PriceTableModal` — редактирует таблицы цен (Tabs по индексу, inline-редактирование ячеек, вложенная Modal для редактирования колонки), открывается из `PricesTable` по кнопке `TableOutlined`.

Пользователю приходится работать в двух независимых модалках для одной сущности. Нет возможности одновременно видеть поля услуги и её таблицы. Нет кнопки дублирования записи, что вынуждает вручную вводить данные для похожих услуг.

Текущий `page.tsx` управляет состоянием обеих модалок через `priceModalOpen`, `priceTableModalOpen` и отдельные handlers. `usePricesPageActions` содержит `handlePriceTableModalClose`.

Дизайн задачи: `https://api.anthropic.com/v1/design/h/YmK_n3LbO7X8fkB_GEWQsQ?open_file=Duplicate+Price+Modal.html` — необходимо открыть вручную в браузере перед реализацией и сверить визуальные детали с планом.

## Цель

1. Заменить `PriceModal` + `PriceTableModal` единым `PriceEditModal` шириной 1200px (диапазон 720–1600px) с вкладками «Общее» и «Таблица N».
2. Убрать кнопку `TableOutlined` из `PricesTable`. Добавить кнопку дублирования (иконка `CopyOutlined`).
3. Дублирование: открывает `PriceEditModal` в режиме создания с предзаполненными данными (name, description, groups, price_tables) из исходной записи; slug и photos не копируются.
4. API endpoint'ы не меняются: `createPrice` (POST /prices) и `updatePrice` (PATCH /prices/{id}) сохраняют все поля включая `price_tables` единым запросом.
5. Сохранение — единый PATCH/POST: все поля услуги + все price_tables одновременно.

---

## Детали реализации

### Frontend

#### Визуальные требования из дизайна

> Перед реализацией исполнителю необходимо открыть URL вручную:
> `https://api.anthropic.com/v1/design/h/YmK_n3LbO7X8fkB_GEWQsQ?open_file=Duplicate+Price+Modal.html`
> и сверить следующие детали с планом.

На основании описания задачи зафиксированы следующие визуальные требования:

**Модалка `PriceEditModal`:**
- Ширина 1200px (min 720px, max 1600px), `style={{ top: 20 }}`
- Шапка: заголовок «Редактировать услугу» / «Добавить услугу» / «Добавить услугу (дубль)» + текущее имя услуги как subtitle
- Бейдж «Несохранённые изменения» (Ant Design `Tag` warning/yellow) — показывается когда `isDirty === true`
- Лента вкладок (AntD `Tabs` type="card"): «Общее» | «Таблица 1» (Badge с размером N×M) | «Таблица 2» | ... | «+ Добавить таблицу»
- Вкладки показывают точку: жёлтую (dirty) или красную (validation error) — реализуется через кастомный label
- При наведении на вкладку-таблицу — крестик для быстрого удаления (кнопка `CloseOutlined`, size small, danger, показывается hover)
- Подвал (footer массив): слева «Удалить услугу» (danger outlined + Popconfirm с вводом названия) | справа «Закрыть» (outlined) | «Сохранить» / «Добавить»
- «Сохранить» disabled если `!isDirty || hasErrors`; при клике с ошибками — переключает activeTab на «Общее»
- Закрытие с dirty — Popconfirm «Закрыть без сохранения?» (перехватывает `onCancel`)

**Вкладка «Общее»:**
- Поля: Select groups (multiple), Input name (max 63, счётчик серым), TextArea description (max 511, счётчик серым), read-only Input slug
- Если нет таблиц — голубой Alert (Ant Design `Alert` type="info") с кнопкой «Добавить таблицу»
- Счётчики символов серого тона (`text-gray-500 text-sm`)

**Вкладка таблицы:**
- Под-шапка: `«Таблица N · M колонок · K строк»` + кнопки «Дублировать», «+ Строка», «+ Колонка», разделитель `<Divider type="vertical" />`, «Удалить таблицу» (danger)
- Редактирование колонки — inline-панель (Card или div) под под-шапкой, **НЕ вложенная Modal**
- В заголовке колонки — стрелки `LeftOutlined` / `RightOutlined` для перемещения колонки влево-вправо
- Кнопки форматирования ячейки: квадратные toggle-кнопки «Ж» (bold), «К» (italic), «П» (underline) через `Button` active/inactive состояния
- Первая колонка таблицы — порядковый номер строки (не из данных, генерируется render-функцией, `fixed: 'left'`)
- Empty state нет колонок: иконка + заголовок + кнопка «Добавить первую колонку»
- Empty state нет строк: иконка + заголовок + кнопка «Добавить первую строку»

**Деструктивные операции с Popconfirm (все единообразны):**
- Удаление таблицы: «Таблица и все данные будут удалены. Это действие необратимо.»
- Удаление колонки: «Колонка и данные всех строк этой колонки будут удалены.»
- Удаление строки: «Строка будет удалена.»
- Удаление услуги: поле ввода названия для подтверждения (кнопка OK disabled пока ввод ≠ имя)
- Закрытие с dirty: «Есть несохранённые изменения. Закрыть без сохранения?» → «Закрыть» / «Продолжить редактирование»

**Уведомления (toast через `useNotification`):**
- «Изменения сохранены» (success) — при успешном PATCH
- «Услуга создана» (success) — при успешном POST
- «Услуга удалена» (success) — при успешном DELETE

#### Новые и изменяемые файлы

| Что | Путь | Действие |
|---|---|---|
| Новая модалка | `services/frontend/src/features/prices/ui/Price/PriceEditModal.tsx` | Создать |
| Тесты новой модалки | `services/frontend/src/features/prices/ui/Price/PriceEditModal.test.tsx` | Создать |
| Экспорт | `services/frontend/src/features/prices/ui/Price/index.ts` | Обновить: добавить `PriceEditModal`, удалить `PriceModal`/`PriceTableModal` |
| Таблица | `services/frontend/src/features/prices/ui/Price/PricesTable.tsx` | Убрать `TableOutlined`/`onOpenPriceTablesModal`; добавить `CopyOutlined`/`onDuplicatePrice` |
| Страница | `services/frontend/src/app/(protected)/prices/page.tsx` | Убрать `priceTableModalOpen` и handlers; добавить `priceEditModalMode`, `templatePrice`, `handleDuplicatePrice`; интегрировать `PriceEditModal` |
| Хук действий | `services/frontend/src/features/prices/hooks/usePricesPageActions.ts` | Убрать `handlePriceTableModalClose` и `setPriceTableModalOpen` |
| Тесты хука | `services/frontend/src/features/prices/hooks/usePricesPageActions.test.ts` | Создать |
| Старая PriceModal | `services/frontend/src/features/prices/ui/Price/PriceModal.tsx` | Удалить |
| Старая PriceTableModal | `services/frontend/src/features/prices/ui/Price/PriceTableModal.tsx` | Удалить |

#### Описание компонента PriceEditModal

**Props:**
```typescript
type PriceEditModalMode = 'create' | 'update' | 'duplicate';

type PriceEditModalProps = {
    open: boolean;
    onClose: () => void;
    mode: PriceEditModalMode;
    selectedPrice: PriceOutDto | null;      // для update: данные услуги
    templatePrice: PriceOutDto | null;      // для duplicate: источник дублирования
    priceDetail: PriceOutDto | null;        // детальные данные (price_tables)
    priceDetailLoading: boolean;
    onCreate: (createData: PriceCreateInDto) => Promise<boolean>;
    onUpdate: (priceId: UUID, updateData: PriceUpdateInDto) => Promise<boolean>;
    onDelete: (priceId: UUID) => Promise<boolean>;
    validationErrors: Record<string, string[]>;
    onResetValidation: () => void;
    priceGroupsOptions: { key: string; label: string; value: UUID }[];
};
```

**Внутренний state модалки:**
```typescript
const [activeTabKey, setActiveTabKey] = useState<string>('general');
const [name, setName] = useState<string>('');
const [description, setDescription] = useState<string>('');
const [groups, setGroups] = useState<UUID[]>([]);
const [tables, setTables] = useState<TableType[]>([]);
const [editingColumnInfo, setEditingColumnInfo] = useState<{ tableIndex: number; columnIndex: number | null } | null>(null);
const [editingColumn, setEditingColumn] = useState<Partial<TableColumn> | null>(null);
const [isDirty, setIsDirty] = useState<boolean>(false);
const [deleteConfirmName, setDeleteConfirmName] = useState<string>('');
```

**Логика dirty:**
- `isDirty = true` при любом изменении name, description, groups, tables после открытия
- В режиме `duplicate` — всегда `isDirty = true` (данные предзаполнены, но не сохранены)
- При открытии: snapshot исходных данных для сравнения

**Логика валидации:**
- name: `priceCreateSchema`/`priceUpdateSchema` из `src/features/prices/validators/prices.ts`
- Вкладка «Общее» показывает красную точку если есть ошибки валидации name/description/groups
- `hasErrors = Object.keys(validationErrors).length > 0`

**Логика сохранения:**
- Режим `update`: `onUpdate(selectedPrice.id, { name, description, groups, price_tables: filterEmptyTables(tables) })`
- Режим `create` или `duplicate`: `onCreate({ name, description, groups, price_tables: filterEmptyTables(tables) })`
- `filterEmptyTables`: как в старом PriceTableModal — фильтрует таблицы без непустых ячеек

**Inline-панель редактирования колонки:**
- `editingColumnInfo` хранит `{ tableIndex, columnIndex }` или `null`
- Панель рендерится под под-шапкой вкладки таблицы
- Поля: key (disabled если columnIndex !== null — редактирование существующей), title, annotation, cell_formatter toggle-кнопки
- Кнопки «Сохранить колонку» и «Отмена» в панели
- При сохранении: обновляет `tables[tableIndex].columns[columnIndex]`, при смене key — пересчитывает cells

**Логика дублирования таблицы:**
- Глубокая копия `JSON.parse(JSON.stringify(tables[tableIndex]))`
- Вставляет после текущей вкладки
- Переключает `activeTabKey` на новую вкладку

**Перемещение колонок:**
- `handleMoveColumnLeft(tableIndex, columnIndex)`: swap columns[columnIndex] ↔ columns[columnIndex-1]
- `handleMoveColumnRight(tableIndex, columnIndex)`: swap columns[columnIndex] ↔ columns[columnIndex+1]
- Граничные условия: columnIndex === 0 → Left недоступен; columnIndex === length-1 → Right недоступен

#### Изменения в PricesTable

Убрать из props:
- `onOpenPriceTablesModal: (priceId: UUID) => void`

Добавить в props:
- `onDuplicatePrice: (priceId: UUID) => void`

Изменить колонку «Действия»:
- Убрать кнопку `TableOutlined`
- Добавить кнопку `CopyOutlined` с `title="Дублировать"`, `onClick: (e) => { e.stopPropagation(); onDuplicatePrice(record.id) }`
- Сохранить `FileImageOutlined` и `Html5Outlined`

#### Изменения в page.tsx

Убрать:
- `priceTableModalOpen: boolean` state
- `handlePriceTableModalClose`
- `handleOpenPriceTablesModal`
- `onOpenPriceTablesModal` prop в `<PricesTable>`
- `<PriceTableModal ...>` JSX
- импорты `PriceTableModal`, `PriceModal`

Добавить:
- `priceEditModalMode: PriceEditModalMode` (useState, initial `'create'`)
- `templatePrice: PriceOutDto | null` (useState, initial `null`)
- `handleOpenPriceEditModal(priceId: UUID)`: находит price в списке → `setSelectedPrice(price)` → `loadPriceDetail(priceId)` → `setPriceEditModalMode('update')` → `setPriceModalOpen(true)`
- `handleDuplicatePrice(priceId: UUID)`: `loadPriceDetail(priceId)` → сохраняет в `templatePrice` (через callback после load) → `setPriceEditModalMode('duplicate')` → `setPriceModalOpen(true)`
- `<PriceEditModal mode={priceEditModalMode} selectedPrice={selectedPrice} templatePrice={templatePrice} priceDetail={priceDetail} ...>` вместо двух модалок

> **Примечание:** `handleDuplicatePrice` должен дождаться загрузки `priceDetail` перед открытием модалки, чтобы `templatePrice` содержал `price_tables`. Вариант: `loadPriceDetail` → в useEffect следить за `priceDetailLoading === false && priceDetail?.id === duplicateTargetId` → открыть модалку.

#### Изменения в usePricesPageActions

Убрать из параметров:
- `setPriceTableModalOpen`

Убрать из return:
- `handlePriceTableModalClose`

---

## Access matrix

API endpoint'ы остаются без изменений. Задача — frontend CMS only. Контракт не меняется.

| Method | Path | Access class | Roles | Without auth | With auth |
|---|---|---|---|---|---|
| GET | /api/prices | Public Read | — | 200 OK | 200 OK |
| GET | /api/prices/{id} | Public Read | — | 200 OK | 200 OK |
| POST | /api/prices | Protected Write | ADMIN, DEVELOPER | 401/403 | 200 OK |
| PATCH | /api/prices/{id} | Protected Write | ADMIN, DEVELOPER | 401/403 | 200 OK |
| DELETE | /api/prices/{id} | Protected Write | ADMIN, DEVELOPER | 401/403 | 204 No Content |

Нет новых endpoint'ов. Нет изменений access policy. Frontend использует существующий контракт через `usePrices` hook.

---

## Frontend test matrix

| Area | Behavior diff | Required tests | Access scenario | Commands |
|---|---|---|---|---|
| `PriceEditModal.tsx` (General tab) | Новый unified modal — поля name/description/groups/slug | 5 component: render fields, dirty badge, char counters, valid submit, validation error | authenticated | `npm test` |
| `PriceEditModal.tsx` (Table tab) | Inline column edit, move left/right, row/col add/delete, formatter toggles | 5 component: tab switch, add table, add col, add row, delete row Popconfirm | authenticated | `npm test` |
| `PriceEditModal.tsx` (dirty close guard) | Popconfirm при dirty close | 1 component: dirty → close → Popconfirm shown | authenticated | `npm test` |
| `PriceEditModal.tsx` (save disabled) | disabled кнопка если !dirty или ошибки | 2 component: disabled !dirty; disabled validation error | authenticated | `npm test` |
| `PriceEditModal.tsx` (backend error) | toast.error при 400/500 | 1 component: backend error → toast.error | authenticated | `npm test` |
| `PriceEditModal.tsx` (delete confirm) | Popconfirm удаления с вводом имени | 1 component: correct name → onDelete called | PRICE_DELETE scope | `npm test` |
| `PriceEditModal.tsx` (success refresh) | После save → onClose | 1 component: successful submit → onClose | authenticated | `npm test` |
| `PriceEditModal.tsx` (duplicate mode) | Предзаполнение из templatePrice, onCreate (не onUpdate) | 2 component: mode=duplicate предзаполняет; submit → onCreate | authenticated | `npm test` |
| `PriceEditModal.tsx` (tab dirty dots) | Жёлтая/красная точка на вкладке | 1 component: изменение name → «Общее» dirty dot | authenticated | `npm test` |
| `PriceEditModal.tsx` (table duplicate) | Дублировать таблицу → новая вкладка | 1 component: duplicate → tables.length+1, новая вкладка активна | authenticated | `npm test` |
| `PriceEditModal.tsx` (move column) | Перемещение колонки ← → | 1 component: moveLeft → columns переставлены | authenticated | `npm test` |
| `PriceEditModal.tsx` (scope: no delete) | Кнопка «Удалить» скрыта без PRICE_DELETE | 1 component: mode=update, нет scope → Удалить не рендерится | scope missing | `npm test` |
| `PricesTable.tsx` | Убрана TableOutlined; добавлена CopyOutlined | 3 component: нет TableOutlined, CopyOutlined есть, клик → onDuplicatePrice | authenticated | `npm test` |
| `usePricesPageActions.ts` | Убран handlePriceTableModalClose | 2 unit: handlePriceModalClose работает; handlePriceTableModalClose отсутствует в export | — | `npm test` |
| Access: anonymous CMS route | `/prices` redirect to login | 1 (existing layout test) | anonymous | `npm test` |
| Access: PRICE_CREATE scope missing | Кнопка «Добавить» скрыта | 1 scope test | scope missing | `npm test` |
| Access: backend 401/403 | toast.error при 401/403 | 1 MSW: 401 → error toast | 401 scenario | `npm test` |
| No site-* mixing | Нет Public Read consumer code | rg self-check | — | `rg` |

---

## Manual QA steps (UI тестирование)

**Предусловие:** CMS запущен локально `http://localhost:3000`. Пользователь авторизован с ролью ADMIN. Раздел: «Цены и услуги» → вкладка «Цены и услуги».

---

### Блок 1: Anonymous redirect

| # | Действие | Ожидаемый результат |
|---|---|---|
| 1.1 | Открыть `http://localhost:3000/prices` без cookie | Редирект на `/login`, страница prices недоступна |

---

### Блок 2: Открытие PriceEditModal в режиме редактирования

| # | Предусловие | Действие | Ожидаемый результат |
|---|---|---|---|
| 2.1 | Авторизован ADMIN, есть услуга с таблицами | Кликнуть по строке услуги | Открывается `PriceEditModal` ~1200px. Заголовок «Редактировать услугу» + имя услуги. Активна вкладка «Общее». Поля заполнены. Slug read-only. |
| 2.2 | Модалка открыта | Изменить поле «Название» | Бейдж «Несохранённые изменения» появляется. Точка dirty на вкладке «Общее». Кнопка «Сохранить» активна. |
| 2.3 | Модалка открыта с данными | Очистить поле «Название» | Вкладка «Общее» показывает красную точку. Кнопка «Сохранить» disabled. Счётчик `0/63`. |
| 2.4 | Dirty state | Нажать «Закрыть» | Popconfirm «Есть несохранённые изменения. Закрыть без сохранения?». |
| 2.5 | Popconfirm открыт | Нажать «Продолжить редактирование» | Модалка остаётся открытой, данные не потеряны. |
| 2.6 | Валидное название, dirty | Нажать «Сохранить» | Модалка закрывается. Toast «Изменения сохранены». Таблица обновляется. |

---

### Блок 3: Вкладки таблиц

| # | Предусловие | Действие | Ожидаемый результат |
|---|---|---|---|
| 3.1 | Услуга без таблиц | Открыть модалку редактирования | На вкладке «Общее» голубой Alert «Добавьте таблицу» с кнопкой. |
| 3.2 | Alert виден | Нажать «Добавить таблицу» в Alert | Появляется вкладка «Таблица 1», активна. Под-шапка: «Таблица 1 · 0 колонок · 0 строк». Empty state нет колонок. |
| 3.3 | Вкладка «Таблица 1» | Нажать «+ Колонка» | Появляется inline-панель (НЕ отдельная Modal) с полями key, title, annotation, форматтеры. |
| 3.4 | Inline-панель открыта | Заполнить title «Услуга», нажать «Сохранить» в панели | Панель закрывается. Заголовок колонки «Услуга». Под-шапка: «Таблица 1 · 1 колонка · 0 строк». |
| 3.5 | Таблица с колонкой | Навести мышь на вкладку «Таблица 1» | Появляется крестик (CloseOutlined) рядом с названием вкладки. |
| 3.6 | Hover на вкладке | Нажать крестик вкладки | Popconfirm «Таблица и все данные будут удалены. Это действие необратимо.». После «Да» — вкладка удалена, активна «Общее». |
| 3.7 | Таблица с 2+ колонками | В заголовке 2-й колонки нажать «←» | 2-я колонка перемещается влево, порядок меняется в заголовках. |
| 3.8 | Таблица с колонкой | Нажать «+ Строка» | Добавляется строка. Первая колонка = порядковый номер «1». Для каждой колонки: Input значение, Input аннотация, кнопки «Ж» «К» «П». |
| 3.9 | Строка добавлена | Нажать кнопку «Ж» у ячейки | Кнопка визуально активна. Input значения отображает bold. |
| 3.10 | Таблица с данными | Нажать «Дублировать» в под-шапке | Новая вкладка «Таблица 2» с копией. Переключение на «Таблица 2». Badge: «0×0» если нет строк, или соответствующий размер. |
| 3.11 | Строки есть | Нажать удаление строки (Popconfirm), подтвердить | Строка удаляется. Номера пересчитываются. |
| 3.12 | Dirty (добавлена таблица) | Нажать «Сохранить» | Модалка закрывается. Toast «Изменения сохранены». Список обновляется. |

---

### Блок 4: Удаление услуги

| # | Предусловие | Действие | Ожидаемый результат |
|---|---|---|---|
| 4.1 | Авторизован ADMIN, модалка открыта (update) | Нажать «Удалить услугу» (слева в подвале) | Popconfirm с полем ввода названия. Кнопка «Удалить» disabled пока поле не заполнено. |
| 4.2 | Popconfirm открыт | Ввести неверное название, нажать «Удалить» | Кнопка остаётся disabled (ввод ≠ имя). |
| 4.3 | Popconfirm открыт | Ввести точное название, нажать «Удалить» | Услуга удаляется. Модалка закрывается. Toast «Услуга удалена». Строка пропадает из таблицы. |
| 4.4 | Авторизован без scope PRICE_DELETE | Открыть модалку редактирования | Кнопки «Удалить услугу» нет в подвале. |

---

### Блок 5: Кнопка дублирования

| # | Предусловие | Действие | Ожидаемый результат |
|---|---|---|---|
| 5.1 | Строка «Консультация» с таблицами | Нажать `CopyOutlined` в колонке «Действия» | Открывается `PriceEditModal` с заголовком «Добавить услугу (дубль)». name = «Консультация», description/groups = исходные. Slug пустой. Вкладки таблиц — копии из исходной. isDirty=true. |
| 5.2 | Модалка duplicate открыта | Изменить название на «Консультация (копия)», нажать «Добавить» | Создаётся новая запись. Модалка закрывается. Toast «Услуга создана». Новая строка в таблице. |
| 5.3 | Модалка duplicate открыта без изменений | Нажать «Закрыть» | Popconfirm «Закрыть без сохранения?» (режим duplicate всегда dirty). |
| 5.4 | Модалка duplicate открыта | Нажать «Добавить» с исходным именем | Создаётся запись (backend допускает дубли по имени). Toast «Услуга создана». |

---

### Блок 6: TableOutlined отсутствует

| # | Действие | Ожидаемый результат |
|---|---|---|
| 6.1 | Проверить колонку «Действия» в таблице «Цены и услуги» | Кнопки TableOutlined нет. Присутствуют: CopyOutlined, FileImageOutlined, Html5Outlined. |

---

### Блок 7: Responsive checks

| # | Viewport | Действие | Ожидаемый результат |
|---|---|---|---|
| 7.1 | 1920×1080 (Desktop) | Открыть `PriceEditModal` | Модалка ~1200px. Все поля и кнопки видны. Вкладки таблицы без overflow. Нет overlap. |
| 7.2 | 768×1024 (Tablet) | Открыть `PriceEditModal` | Модалка ~95% viewport. Нет overlap кнопок в подвале. Вкладки с горизонтальным скроллом при множестве таблиц. |
| 7.3 | 375×812 (Mobile) | Открыть `PriceEditModal` | Модалка 100% ширины. Подвал без overlap. Нет обрезанного текста. |

---

### Блок 8: Regression

| # | Действие | Ожидаемый результат |
|---|---|---|
| 8.1 | Перейти на вкладку «Группы услуг» | Таблица групп, PriceGroupModal, кнопка реордера работают как прежде. |
| 8.2 | Нажать `FileImageOutlined` в строке | PhotoSelectorModal открывается как прежде. |
| 8.3 | Нажать `Html5Outlined` в строке | PageEditorModal открывается как прежде. |

---

### Итоговый отчет QA

Исполнитель заполняет таблицу:

| Блок | Шаги | Статус | Примечания / Screenshots |
|---|---|---|---|
| 1 Anonymous | 1.1 | PASS/FAIL | |
| 2 Редактирование | 2.1–2.6 | PASS/FAIL | |
| 3 Таблицы | 3.1–3.12 | PASS/FAIL | |
| 4 Удаление | 4.1–4.4 | PASS/FAIL | |
| 5 Дублирование | 5.1–5.4 | PASS/FAIL | |
| 6 TableOutlined | 6.1 | PASS/FAIL | |
| 7 Responsive | 7.1–7.3 | PASS/FAIL | Screenshots при FAIL |
| 8 Regression | 8.1–8.3 | PASS/FAIL | |

---

## Порядок выполнения

1. Вручную открыть дизайн-файл и сверить визуальные детали с планом
2. Создать `PriceEditModal.tsx` — вкладка «Общее» (поля, slug read-only, dirty badge, char counters, Alert без таблиц)
3. Добавить в `PriceEditModal.tsx` — логику tabs (Таблица N с Badge, «+ Добавить таблицу», крестик на hover)
4. Добавить в `PriceEditModal.tsx` — table tab content: под-шапка, inline column editor, move left/right, formatter toggles, row numbering, empty states
5. Добавить в `PriceEditModal.tsx` — dirty tracking, validation dots, save disabled logic
6. Добавить в `PriceEditModal.tsx` — Popconfirm guards (dirty close, delete with name confirm, delete table/column/row)
7. Добавить в `PriceEditModal.tsx` — duplicate mode (предзаполнение из templatePrice, mode label, onCreate vs onUpdate)
8. Обновить `PricesTable.tsx` — убрать `TableOutlined`/`onOpenPriceTablesModal`, добавить `CopyOutlined`/`onDuplicatePrice`
9. Обновить `usePricesPageActions.ts` — убрать `handlePriceTableModalClose`/`setPriceTableModalOpen`
10. Обновить `page.tsx` — заменить два модалки на `PriceEditModal`, добавить `priceEditModalMode`, `templatePrice`, `handleDuplicatePrice`
11. Обновить `index.ts` — экспорт `PriceEditModal`, удалить `PriceModal`/`PriceTableModal`
12. Удалить `PriceModal.tsx` и `PriceTableModal.tsx`
13. Написать тесты `PriceEditModal.test.tsx`
14. Написать тесты `usePricesPageActions.test.ts`
15. Обновить/добавить тесты `PricesTable` — CopyOutlined, нет TableOutlined
16. Запустить: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`
17. Провести Manual QA (8 блоков, 28+ шагов)

---

## Чеклист

> ⚠️ Этот раздел используется агентами для отслеживания прогресса.
> Агент обязан менять `[ ]` → `[x]` после выполнения каждого пункта.

### Frontend

- [ ] Вручную открыть дизайн `https://api.anthropic.com/v1/design/h/YmK_n3LbO7X8fkB_GEWQsQ?open_file=Duplicate+Price+Modal.html` и сверить визуальные требования с планом
- [ ] Создать `services/frontend/src/features/prices/ui/Price/PriceEditModal.tsx` — компонент полностью
- [ ] Вкладка «Общее»: поля groups (Select multiple), name (Input max 63, счётчик), description (TextArea max 511, счётчик), slug (Input read-only)
- [ ] Голубой Alert «Добавьте таблицу» на вкладке «Общее» когда `tables.length === 0`
- [ ] Dirty tracking: `isDirty` при любом изменении; бейдж «Несохранённые изменения» (AntD Tag warning)
- [ ] Dirty close guard: при `isDirty && onClose` → Popconfirm «Есть несохранённые изменения. Закрыть без сохранения?»
- [ ] Вкладки таблиц: «Таблица N» с Badge N×M, вкладка «+ Добавить таблицу», крестик при hover
- [ ] Крестик на вкладке таблицы → Popconfirm «Таблица и все данные будут удалены. Это действие необратимо.»
- [ ] Под-шапка таблицы: «Таблица N · M колонок · K строк» + кнопки «Дублировать», «+ Строка», «+ Колонка», Divider, «Удалить таблицу» (danger)
- [ ] Inline-панель редактирования колонки (НЕ Modal): key, title, annotation, formatter toggles; «Сохранить колонку» / «Отмена»
- [ ] Стрелки ← → в заголовке колонки для перемещения
- [ ] Toggle-кнопки форматирования: «Ж» (bold), «К» (italic), «П» (underline) — квадратные, active/inactive
- [ ] Первая колонка таблицы — порядковый номер строки (fixed: 'left', не из данных)
- [ ] Empty state «нет колонок»: иконка + текст + кнопка «Добавить первую колонку»
- [ ] Empty state «нет строк»: иконка + текст + кнопка «Добавить первую строку»
- [ ] Дублирование таблицы: глубокая копия, вставка после текущей, switch на новую вкладку
- [ ] Валидационные точки на вкладках: жёлтая (dirty), красная (validation error)
- [ ] Кнопка «Сохранить» disabled если `!isDirty || hasErrors`
- [ ] При клике «Сохранить» с ошибками — переключение activeTab на «Общее»
- [ ] Popconfirm удаления услуги с полем ввода: кнопка OK disabled пока `deleteConfirmName !== selectedPrice.name`
- [ ] Popconfirm удаления колонки: «Колонка и данные всех строк этой колонки будут удалены.»
- [ ] Popconfirm удаления строки: «Строка будет удалена.»
- [ ] Режим `mode='update'`: заголовок «Редактировать услугу», кнопка «Сохранить», `onUpdate` при submit
- [ ] Режим `mode='create'`: заголовок «Добавить услугу», кнопка «Добавить», `onCreate` при submit
- [ ] Режим `mode='duplicate'`: заголовок «Добавить услугу (дубль)», поля из `templatePrice`, isDirty=true, кнопка «Добавить», `onCreate`, без slug/photos
- [ ] scope PRICE_DELETE: кнопка «Удалить услугу» скрыта если `!hasPermission(PRICE_PAGE_SCOPES_ACTIONS.PRICE_DELETE)`
- [ ] scope PRICE_UPDATE: кнопка «Сохранить» скрыта/disabled если нет scope
- [ ] scope PRICE_CREATE: кнопка «Добавить» скрыта если нет scope
- [ ] Toast «Изменения сохранены» при успешном PATCH
- [ ] Toast «Услуга создана» при успешном POST
- [ ] Toast «Услуга удалена» при успешном DELETE
- [ ] filterEmptyTables перед сохранением (create/update/duplicate)
- [ ] Обновить `services/frontend/src/features/prices/ui/Price/index.ts`
- [ ] Изменить `services/frontend/src/features/prices/ui/Price/PricesTable.tsx`: убрать `TableOutlined`/`onOpenPriceTablesModal`, добавить `CopyOutlined`/`onDuplicatePrice`
- [ ] Обновить `services/frontend/src/features/prices/hooks/usePricesPageActions.ts`: убрать `handlePriceTableModalClose`, `setPriceTableModalOpen`
- [ ] Обновить `services/frontend/src/app/(protected)/prices/page.tsx`: `priceEditModalMode`, `templatePrice`, `handleDuplicatePrice`, `<PriceEditModal>`
- [ ] Удалить `services/frontend/src/features/prices/ui/Price/PriceModal.tsx`
- [ ] Удалить `services/frontend/src/features/prices/ui/Price/PriceTableModal.tsx`
- [ ] Test `PriceEditModal`: render General tab с предзаполненными полями (update mode)
- [ ] Test `PriceEditModal`: dirty badge показывается при изменении name
- [ ] Test `PriceEditModal`: char counter для name (0/63)
- [ ] Test `PriceEditModal`: validation error dot на вкладке «Общее» при пустом name
- [ ] Test `PriceEditModal`: valid submit (update mode) вызывает `onUpdate`
- [ ] Test `PriceEditModal`: backend error 400 → toast.error вызван
- [ ] Test `PriceEditModal`: dirty close → Popconfirm открывается
- [ ] Test `PriceEditModal`: save disabled когда `!isDirty`
- [ ] Test `PriceEditModal`: save disabled когда validation error
- [ ] Test `PriceEditModal`: mode='duplicate' предзаполняет поля из templatePrice
- [ ] Test `PriceEditModal`: mode='duplicate' submit вызывает `onCreate` (не `onUpdate`)
- [ ] Test `PriceEditModal`: add table → новая вкладка появляется
- [ ] Test `PriceEditModal`: add column → inline-панель появляется (нет отдельного Modal)
- [ ] Test `PriceEditModal`: add row → строка добавляется
- [ ] Test `PriceEditModal`: delete row Popconfirm → строка удаляется после confirm
- [ ] Test `PriceEditModal`: duplicate table → tables.length+1
- [ ] Test `PriceEditModal`: moveColumnLeft → columns переставлены
- [ ] Test `PriceEditModal`: formatter toggle «Ж» → ячейка получает text_bold
- [ ] Test `PriceEditModal`: mode=update, нет scope PRICE_DELETE → кнопка «Удалить услугу» не рендерится
- [ ] Test `PricesTable`: CopyOutlined присутствует, TableOutlined отсутствует
- [ ] Test `PricesTable`: клик CopyOutlined → onDuplicatePrice вызван с id записи
- [ ] Test `PricesTable`: клик по строке → onOpenPriceModal вызван (regression)
- [ ] Test `usePricesPageActions`: handlePriceModalClose работает
- [ ] Test `usePricesPageActions`: handlePriceTableModalClose не экспортируется (regression guard)
- [ ] rg self-check: нет прямых `fetch`/`axios` вне `src/api`
- [ ] rg self-check: нет `site-ad`/`site-*` в CMS frontend

### Quality Gate

- [ ] Проверить, что Access matrix не изменилась (нет новых endpoint'ов, нет изменений policy)
- [ ] Проверить FSD: весь новый код в `src/features/prices/` и `src/app/(protected)/prices/`
- [ ] Проверить: нет бизнес-логики в `page.tsx` (только вызовы hooks)
- [ ] Проверить: нет прямых API imports в `page.tsx` и feature UI
- [ ] Проверить: иконки только из `@ant-design/icons`
- [ ] Проверить: форма валидируется через `priceCreateSchema`/`priceUpdateSchema` (Zod)
- [ ] Проверить: scope-guard на все деструктивные actions (PRICE_DELETE, PRICE_UPDATE, PRICE_CREATE)
- [ ] Проверить: toast через `useNotification` (не прямые AntD notification calls)
- [ ] Проверить: `PriceEditModal` самодостаточен — не импортирует из `PriceModal` или `PriceTableModal`
- [ ] Проверить: dirty close guard не допускает потери данных (Popconfirm обязателен при isDirty)
- [ ] Проверить: `filterEmptyTables` применяется перед любым сохранением
- [ ] Проверить: в режиме duplicate slug и photos не копируются
- [ ] Запустить из `services/frontend`: `npm test` — все тесты зелёные
- [ ] Запустить из `services/frontend`: `npm run lint` — 0 ошибок
- [ ] Запустить из `services/frontend`: `npx tsc --noEmit` — без ошибок типов
- [ ] Запустить из `services/frontend`: `npm run build` — успешная сборка
- [ ] Выполнить все 8 блоков Manual QA (28+ шагов), заполнить итоговую таблицу
- [ ] Проверить responsive на desktop/tablet/mobile: нет overlap кнопок, текста, таблицы
- [ ] Проверить regression: PriceGroupModal, PhotoSelectorModal, PageEditorModal не затронуты

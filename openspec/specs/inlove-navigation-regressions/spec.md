# Purpose

Требования к исправленному интерактивному и адаптивному поведению навигации сайта «ИНЛав».

## Requirements

### Requirement: Desktop dropdown имеет непрерывную интерактивную поверхность
На desktop trigger «Услуги» и dropdown SHALL образовывать одну pointer-safe область без hover-gap, а dropdown SHALL иметь непрозрачный surface background, border и достаточный stacking context. Медленный перевод курсора от trigger к любому из трёх пунктов MUST NOT закрывать меню; keyboard, focus, click и `Escape` behavior из shell-контракта MUST сохраняться.

#### Scenario: Медленный pointer переход
- **WHEN** пользователь наводит trigger и медленно переводит курсор через нижнюю границу к пункту dropdown
- **THEN** dropdown остаётся открытым и пункт можно активировать без повторного открытия

#### Scenario: Непрозрачный dropdown
- **WHEN** меню открыто поверх hero или контента
- **THEN** фон пунктов непрозрачен, текст читаем и underlying content не смешивается визуально с меню

#### Scenario: Keyboard regression отсутствует
- **WHEN** пользователь открывает dropdown клавиатурой и нажимает `Escape`
- **THEN** focus возвращается trigger, active child semantics и доступные имена сохранены

### Requirement: Mobile menu покрывает visual viewport независимо от header
Открытое mobile menu SHALL рендериться как viewport-level modal overlay с `position: fixed`, корректной высотой `100dvh`/safe fallback и шириной viewport, не ограничиваясь box/stacking context sticky header. Overlay MUST блокировать scroll фона, учитывать safe areas, оставаться прокручиваемым при короткой высоте и сохранять focus trap/close/Escape/focus return.

#### Scenario: Overlay на весь экран
- **WHEN** burger открывается на ширине 320 или 768 px
- **THEN** меню закрывает весь видимый viewport от верхней до нижней safe area, а page content и header не остаются интерактивными

#### Scenario: Короткий mobile viewport
- **WHEN** высоты недостаточно для всех links, contacts и CTA
- **THEN** содержимое overlay прокручивается внутри viewport без горизонтального scroll и без недоступных controls


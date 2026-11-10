# Delta — инструменты браузерной проверки

## ADDED Requirements

### Requirement: Объяснимая граница computed contrast
Contrast helper SHALL вычислять ratio только для поддерживаемого однозначного paint, сохраняя пороги text 4.5, largeText/UI 3. Для неподдерживаемого paint SHALL возвращаться `contrast_unsupported` с безопасным reason code без ratio и без PASS. Normal/hover/focus/error SHALL проверяться независимо, чтобы unsupported одного состояния не скрывал результаты остальных.

#### Scenario: CT-01 Поддерживаемые цвета и состояния
- **WHEN** проверяется synthetic поверхность с RGB/RGBA, прозрачным фоном предков и однозначным текстом в normal/hover/focus/error
- **THEN** ratio соответствует аналитическому значению с допуском 0.001, state/size applicability проверяется, значения ниже порога дают FAIL

#### Scenario: CT-02 Неоднозначная отрисовка
- **WHEN** присутствуют gradient/image, opacity/filter/blend, pseudo paint или реальное перекрытие
- **THEN** возвращается безопасная конкретная причина unsupported, ratio отсутствует, сценарий не считается пройденным

#### Scenario: CT-03 Исходный unsupported
- **WHEN** повторяются прежние UI-QA-07-error и UI-QA-07-contrast с теми же locators и состояниями
- **THEN** фиксируются before/after и причина; поддерживаемый случай вычисляется корректно, а действительно неподдерживаемый остаётся явно blocked без закрытия finding подменным axe или выдуманным ratio

### Requirement: Доказательная диагностика retry matcher
Проверка retry SHALL различать locator cardinality, accessible name, native/ARIA disabled, loading и состояние после remount. Один finite fixture набор SHALL доказывать отсутствие автоматического POST retry и отдельный явный retry. Недоказанное противоречие matcher и DOM MUST NOT классифицироваться product defect или закрываться увеличением sleep/timeout.

#### Scenario: RT-01 Ошибка и явный повтор
- **WHEN** synthetic POST возвращает 400/403/502/503/network, затем после явного действия пользователя 202
- **THEN** сохраняются безопасные matcher/DOM diagnostics, до явного действия posts=1 и список не перечитывается, после действия posts=2 и 202 означает только принятие; disabled control отрицательного case отклоняется

#### Scenario: RT-02 Сессия истекла
- **WHEN** synthetic POST возвращает 401
- **THEN** сохраняется предусмотренный auth flow, retry на исчезнувшей модалке не требуется и не объявляется успешным

#### Scenario: RT-03 Противоречие не воспроизведено
- **WHEN** точный исходный locator/assertion уже зелёный либо причина требует product UI изменений
- **THEN** сохраняется unreproduced либо blocked с evidence; product code и thresholds не изменяются, новый scope передаётся Router

## ADDED Requirements

### Requirement: Главная содержит именованную компактную секцию услуг
Главная SHALL серверно рендерить перед четырьмя service cards видимый `h2` «Услуги» в том же heading rhythm, что и секция новостей. Heading и cards MUST принадлежать одному section/container, а существующие labels, href и локальные icons SHALL сохраняться.

#### Scenario: SSR heading и карточки
- **WHEN** anonymous visitor получает HTML главной
- **THEN** в исходном HTML присутствуют heading «Услуги» и четыре ссылки «Занятия», «Прогулки», «Абонементы», «Постой»

### Requirement: Сетка услуг не создаёт избыточную пустоту
Service section SHALL использовать адаптивную геометрию карточек и section spacing по существующим tokens: на desktop четыре карточки заполняют доступную строку без искусственно высокой квадратной зоны, а на tablet/mobile сетка перестраивается без большого пустого участка сверху или после карточек. Touch targets, focus rings и отсутствие horizontal scroll MUST сохраняться.

#### Scenario: Desktop density
- **WHEN** секция отображается на 1024 и 1440 px
- **THEN** четыре карточки визуально заполняют container, а расстояние до heading и следующей секции соответствует section rhythm без избыточного пустого пространства

#### Scenario: Mobile density
- **WHEN** секция отображается на 320 и 768 px с длинным label
- **THEN** карточки и heading остаются читаемыми, нет обрезания/перекрытия/horizontal scroll и нет пустой зоны от принудительного aspect ratio


## 0. Роль этого документа

Этот документ является визуальной спецификацией сайта конного клуба INLOVE.

Его задача — обеспечить единый визуальный язык на всех страницах и всех breakpoint'ах.

При проектировании новых секций агент должен сначала использовать существующие правила и компоненты из этого документа. Новые визуальные паттерны вводить только в том случае, если существующие действительно не подходят.

Главный принцип:

**Premium editorial equestrian lifestyle.  
Спокойно. Натурально. Просторно. Тактильно. Без визуального шума.**

---

# 1. Базовое визуальное направление

## 1.1. Ключевые ассоциации

Сайт должен визуально ассоциироваться с:

- современным загородным клубом;
    
- boutique hotel;
    
- wellness retreat;
    
- европейским equestrian lifestyle;
    
- fashion/editorial-фотографией;
    
- натуральными материалами;
    
- природой;
    
- тишиной;
    
- доверием;
    
- тактильностью;
    
- светом;
    
- эмоциональным контактом человека и лошади.
    

Не должен ассоциироваться с:

- фермой;
    
- ковбойской эстетикой;
    
- детским развлекательным центром;
    
- агрессивным спортом;
    
- классическим luxury с золотом;
    
- банковским премиумом;
    
- SaaS;
    
- типовым Tilda-лендингом.
    

---

# 2. Цветовая система

## 2.1. Основные цвета

### Background / Ivory

`#F7F3EC`

Основной фон сайта.

Использование:

- 60–70% поверхности;
    
- большинство секций;
    
- формы;
    
- большие editorial-композиции;
    
- footer secondary elements.
    

Не заменять чистым `#FFFFFF` без причины.

---

### Surface White

`#FCFAF6`

Использовать для:

- карточек;
    
- модальных окон;
    
- dropdown;
    
- hover surface;
    
- светлых input;
    
- внутренних поверхностей.
    

---

### Forest 900

`#1F352B`

Главный тёмный брендовый цвет.

Использование:

- primary CTA;
    
- footer;
    
- крупные тёмные секции;
    
- заголовки на светлом фоне;
    
- активные состояния;
    
- navigation accents.
    

---

### Forest 800

`#294439`

Hover / secondary dark.

---

### Forest 700

`#355347`

Pressed / accent.

---

### Sage 500

`#AEB9A6`

Использование:

- muted background;
    
- small badge;
    
- декоративные поверхности;
    
- hover backgrounds;
    
- quote sections;
    
- secondary controls.
    

---

### Sage 200

`#DDE3D8`

Для тонких подложек.

---

### Sand 500

`#C8B596`

Тёплый натуральный акцент.

---

### Sand 200

`#E6DDD0`

Background акцентных секций.

---

### Clay 500

`#A87356`

Использовать очень дозированно.

Применение:

- underline;
    
- small active dot;
    
- small category label;
    
- hover icon;
    
- decorative line.
    

Не использовать как основной CTA.

---

### Charcoal 900

`#242724`

Основной цвет текста.

---

### Charcoal 700

`#484D49`

Вторичный текст.

---

### Charcoal 500

`#737973`

Meta / helper / подписи.

---

### Border

`rgba(36, 39, 36, 0.14)`

---

### Border Strong

`rgba(36, 39, 36, 0.24)`

---

### White

`#FFFFFF`

Использовать только:

- текст на dark background;
    
- border-white;
    
- overlays.
    

---

# 3. Семантические color tokens

```
--color-bg-primary: #F7F3EC
--color-bg-secondary: #FCFAF6
--color-bg-dark: #1F352B

--color-text-primary: #242724
--color-text-secondary: #484D49
--color-text-muted: #737973
--color-text-inverse: #FFFFFF

--color-brand-primary: #1F352B
--color-brand-hover: #294439
--color-brand-pressed: #355347

--color-accent-sage: #AEB9A6
--color-accent-sand: #C8B596
--color-accent-clay: #A87356

--color-border: rgba(36,39,36,.14)
--color-border-strong: rgba(36,39,36,.24)
```

---

# 4. Типографика

## 4.1. Font pair

### Display / Headlines

Рекомендуемый основной:

**Cormorant Garamond**

Weights:

- 400 Regular;
    
- 500 Medium;
    
- 600 SemiBold;
    
- Italic 400.
    

Если визуально потребуется более современный вариант:

**Instrument Serif**

Допустимый альтернативный вариант:

**Playfair Display**

Нельзя смешивать больше одного display-serif одновременно.

---

### UI / Body

Основной:

**Manrope**

Weights:

- 400 Regular;
    
- 500 Medium;
    
- 600 SemiBold.
    

Допустимая альтернатива:

**Inter**

Не использовать одновременно Manrope и Inter.

---

# 5. Typography tokens

## Desktop ≥ 1280px

### Display XL

Использовать для Hero.

```
font-family: Cormorant Garamond
font-size: 76px
line-height: 0.96 / 73px
font-weight: 400
letter-spacing: -0.025em
```

Максимум 3 строки.

---

### Display L

Большие section heading.

```
font-size: 64px
line-height: 1.00
font-weight: 400
letter-spacing: -0.02em
```

---

### H1

```
font-size: 56px
line-height: 1.04
font-weight: 400
letter-spacing: -0.018em
```

---

### H2

```
font-size: 48px
line-height: 1.05
font-weight: 400
letter-spacing: -0.015em
```

---

### H3

```
font-size: 36px
line-height: 1.10
font-weight: 400
letter-spacing: -0.01em
```

---

### H4

```
font-size: 28px
line-height: 1.15
font-weight: 500
```

---

### Body L

```
font-family: Manrope
font-size: 20px
line-height: 1.55
font-weight: 400
letter-spacing: -0.01em
```

---

### Body M

```
font-size: 17px
line-height: 1.60
font-weight: 400
```

Основной body.

---

### Body S

```
font-size: 15px
line-height: 1.55
```

---

### Label

```
font-size: 13px
line-height: 1.3
font-weight: 600
letter-spacing: 0.06em
text-transform: uppercase
```

Использовать редко.

---

### Button

```
font-size: 15px
line-height: 1
font-weight: 500
letter-spacing: -0.005em
```

---

### Navigation

```
font-size: 14px
line-height: 1
font-weight: 500
```

---

### Meta

```
font-size: 13px
line-height: 1.45
font-weight: 400
color: text-muted
```

---

# 6. Responsive typography

## Tablet 768–1279

Hero:

`60px / 0.98`

H1:

`48px / 1.02`

H2:

`42px / 1.06`

H3:

`32px / 1.10`

Body L:

`18px / 1.55`

Body:

`16px / 1.60`

---

## Mobile ≤ 767

Hero:

`42px / 0.98`

Для узких экранов 320–375:

`38px`

H1:

`40px`

H2:

`34px`

H3:

`28px`

H4:

`24px`

Body L:

`18px`

Body:

`16px`

Body S:

`14px`

Button:

`15px`

Минимальный размер читаемого текста:

`14px`.

Не использовать текст `12px` для содержательных элементов.

---

# 7. Типографические паттерны

## 7.1. Serif + Sans

Заголовки:

serif.

Описание и UI:

sans-serif.

Не использовать serif для:

- input;
    
- button;
    
- navigation;
    
- filter;
    
- tabs;
    
- price;
    
- FAQ body.
    

---

## 7.2. Italic accent

Допускается выделение одного слова курсивом:

**Место, где учатся** _**понимать**_ **лошадей**

Не более одного italic-акцента на одну секцию.

---

## 7.3. Line length

Основной текст:

максимум `60–68ch`.

Hero subheading:

максимум `540px`.

Intro text:

максимум `720px`.

---

# 8. Layout

## 8.1. Page container

Desktop:

```
max-width: 1360px
padding-inline: 40px
margin: auto
```

Large desktop ≥ 1440:

```
max-width: 1440px
padding-inline: 56px
```

Tablet:

`32px`

Mobile:

`20px`

Очень маленький mobile:

`16px`

---

# 9. Grid

Desktop:

12 columns.

```
column-gap: 24px
```

Tablet:

8 columns.

```
gap: 20px
```

Mobile:

4 columns.

```
gap: 16px
```

---

# 10. Spacing system

Базовый шаг:

`4px`.

Tokens:

```
4
8
12
16
20
24
32
40
48
56
64
80
96
120
144
160
192
```

Не использовать случайные значения вроде:

`37px`, `53px`, `71px`.

---

# 11. Section spacing

Desktop:

обычный vertical padding:

`120px`

Большая editorial секция:

`144–160px`

Hero:

индивидуально.

Компактная секция:

`80–96px`

Mobile:

обычная секция:

`72px`

Большая:

`96px`

Компактная:

`56px`

---

# 12. Радиусы

Основной визуальный принцип:

**не слишком кругло.**

Никакого excessive rounded SaaS UI.

Tokens:

```
radius-xs: 4px
radius-sm: 8px
radius-md: 12px
radius-lg: 16px
radius-xl: 24px
radius-pill: 999px
```

Использование:

### Button

`8px`

### Input

`8px`

### Standard card

`12px`

### Large image

`16px`

### Quote block

`16px`

### Badge

`999px`

Pill использовать только для badge / small tag.

Primary buttons НЕ делать pill-shaped.

---

# 13. Borders

Стандартная рамка:

```
1px solid rgba(36,39,36,.14)
```

Strong:

```
1px solid rgba(36,39,36,.24)
```

Dark background:

```
1px solid rgba(255,255,255,.20)
```

Не использовать 2px border кроме focus ring.

---

# 14. Shadows

Визуальная система практически без теней.

### Card shadow

```
0 6px 24px rgba(25, 31, 27, 0.05)
```

Использовать только если карточка реально должна отделяться от поверхности.

### Modal

```
0 24px 80px rgba(20, 25, 22, 0.18)
```

Не использовать типичные сильные drop shadow.

---

# 15. Buttons

## Primary

Background:

Forest 900.

Text:

White.

Height:

Desktop `50px`

Mobile `48px`

Padding:

`0 24px`

Radius:

`8px`

Hover:

Forest 800.

Pressed:

Forest 700.

Transition:

`180ms ease-out`.

---

## Secondary

Background:

transparent.

Border:

1px solid Forest 900.

Text:

Forest 900.

Hover:

background Forest 900;

text White.

---

## Ghost

Без border.

Пример:

`Посмотреть всех →`

Text:

Forest 900.

Иконка смещается вправо на hover:

`translateX(4px)`.

---

## Button sizing

### Small

```
height: 40px
padding-inline: 18px
```

### Medium

```
height: 48px
padding-inline: 22px
```

### Large

```
height: 52px
padding-inline: 26px
```

---

# 16. Iconography

Стиль:

thin / outline.

Stroke:

`1.5px`.

Размеры:

```
16
20
24
28
32
```

Основной UI:

`20px`.

Feature icon:

`28–32px`.

Иконки не должны быть декоративной заменой текста.

Избегать:

- подков как универсального icon pattern;
    
- силуэта лошади в каждой карточке;
    
- emoji;
    
- filled icons.
    

---

# 17. Header

Desktop height:

`88px`

Sticky после scroll.

Initial hero state:

transparent.

Text:

white, если header поверх тёмной фотографии.

После scroll:

```
background: rgba(247,243,236,.88)
backdrop-filter: blur(16px)
border-bottom: 1px solid rgba(36,39,36,.08)
```

Scrolled height:

`72px`.

Logo:

width примерно `132–150px`.

Navigation gap:

`28–32px`.

CTA:

height `44px`.

---

# 18. Hero

Desktop height:

```
min-height: 760px
height: 92vh
max-height: 980px
```

Mobile:

```
height: 88svh
min-height: 620px
```

Content align:

bottom-left.

Desktop:

left `64–80px`

bottom `80–96px`.

Mobile:

left/right `20px`

bottom `48px`.

---

# 19. Hero image treatment

Фото:

full bleed.

Object-fit:

cover.

Object-position:

настраивается индивидуально.

Overlay:

```
linear-gradient(
  90deg,
  rgba(18,25,21,.54) 0%,
  rgba(18,25,21,.20) 55%,
  rgba(18,25,21,.04) 100%
)
```

Дополнительно:

bottom gradient:

```
linear-gradient(
  180deg,
  rgba(0,0,0,0) 55%,
  rgba(13,18,15,.22) 100%
)
```

Overlay не должен убивать фотографию.

---

# 20. Photo styling

## Общая обработка

Contrast:

слегка ниже стандартного.

Saturation:

`-5%...-12%`.

Warmth:

умеренная.

Highlights:

мягкие.

Greens:

приглушённые.

Skin tone:

естественный.

Black point:

не задавленный.

---

# 21. Image aspect ratios

Hero:

`16:9`, responsive cover.

Service card:

`4:5`

Horse portrait:

`4:5`

Trainer:

`3:4`

Wide editorial:

`16:10`

Gallery landscape:

`3:2`

Mobile feature:

`4:5`

Не смешивать много случайных пропорций в одной секции.

---

# 22. Image border radius

Hero:

`0`

Full bleed image:

`0`

Editorial image:

`12–16px`

Card image:

верхние углы совпадают с card radius.

---

# 23. Service cards

Карточка направления.

Desktop:

width определяется grid.

Structure:

```
image
24px gap
title
8px gap
description
16px gap
link
```

Card background:

transparent или Surface White.

Если transparent:

не использовать border.

Если surface card:

border `1px solid border`.

Radius:

`12px`.

Hover image:

```
scale(1.025)
transition 500ms cubic-bezier(.2,.7,.2,1)
```

Title:

serif `26–30px`.

Description:

15–16px.

---

# 24. Horse cards

Лошадь должна восприниматься как герой, не как товар.

Image:

`4:5`.

Radius:

`16px`.

Name:

serif `30–36px`.

Meta:

13–14px.

Personality text:

16px.

Допустимый badge:

```
Спокойный
Для новичков
Спортивный
```

Badge background:

rgba Sage.

---

# 25. Trainer cards

Без тяжёлой рамки.

Image:

`3:4`.

Name:

`28px` serif.

Role:

14px muted.

Description:

16px.

Не использовать social links прямо в карточке на главной.

---

# 26. Price section

Не использовать 3-column SaaS pricing.

Основной паттерн:

large list rows.

Row:

```
display: grid
grid-template-columns: 1fr auto
padding: 28px 0
border-bottom
```

Service name:

serif `28px`.

Description:

14–15px.

Price:

sans `20px`, weight 500.

Если есть duration:

`60 мин · 5 000 ₽`

---

# 27. Testimonials

Основной паттерн:

editorial quote.

Quote:

serif.

Desktop:

`34–44px`

Line-height:

`1.15`

Max width:

`900px`.

Author:

14px.

Source:

13px muted.

Quote mark можно использовать как декоративный знак размером `40px`, но не обязателен.

---

# 28. FAQ

Accordion row:

min-height `72px`.

Desktop padding:

`24px 0`.

Question:

18px, weight 500.

Answer:

16px / 1.65.

Icon:

plus → minus.

Animation:

height + opacity `240ms`.

Border-bottom.

Не использовать отдельные card containers для каждого вопроса.

---

# 29. Inputs

Height:

`52px`.

Background:

Surface White.

Border:

`1px solid border`.

Radius:

`8px`.

Padding:

`0 16px`.

Font:

16px.

Placeholder:

text-muted.

Focus:

```
border-color: #1F352B
box-shadow: 0 0 0 3px rgba(31,53,43,.12)
```

---

# 30. Textarea

Min-height:

`128px`.

Padding:

`16px`.

Resize:

vertical.

---

# 31. Form layout

Desktop:

2 columns для:

name / phone.

Полноширинные:

service selector;  
comment;  
submit.

Gap:

`16px`.

Mobile:

1 column.

---

# 32. Select

Нативная визуальная стилизация.

Не использовать complex custom dropdown без необходимости.

Chevron icon 18px.

---

# 33. Error states

Error:

`#9F4D43`

Error background:

`#F5E6E2`

Error text:

13px.

Не использовать яркий красный `#FF0000`.

---

# 34. Success

Success:

`#456653`

Background:

`#E7EFE8`

---

# 35. Badge system

Height:

`28–32px`.

Padding:

`0 12px`.

Radius:

`999px`.

Font:

12px / 500.

Виды:

### neutral

sand background.

### nature

sage background.

### dark

forest background + white.

---

# 36. Decorative lines

Можно использовать тонкие горизонтальные линии:

`1px border`.

Clay line:

максимум `48–64px` шириной.

Использовать как editorial accent перед label.

---

# 37. Background patterns

Основной сайт должен быть почти без паттернов.

Допустимые:

### Paper noise

Очень слабый noise:

opacity `1–2%`.

Никогда не должен быть явно виден.

### Fine grain

Только в отдельных фото- или dark-section.

### Abstract organic line

Очень тонкая линия, напоминающая естественный контур.

Opacity:

`4–8%`.

Нельзя использовать:

- repeating horses;
    
- horseshoes;
    
- клетчатые конные паттерны;
    
- leather texture;
    
- wood texture;
    
- hay texture.
    

---

# 38. Logo area

Логотип должен иметь достаточно воздуха.

Clear space:

не менее `0.5×` высоты логотипа со всех сторон.

Не помещать логотип:

- в card;
    
- в pill;
    
- в круг;
    
- на яркую фотографию без достаточного контраста.
    

---

# 39. Navigation patterns

Active page:

не underline heavy.

Использовать:

- opacity;
    
- small 4px dot;
    
- тонкий underline 1px.
    

Hover:

opacity `0.68 → 1`.

---

# 40. Section labels

Пример:

`О КЛУБЕ`

Использовать:

Manrope;  
13px;  
uppercase;  
tracking `0.08em`.

Color:

Clay или text-muted.

Spacing до heading:

`16–20px`.

---

# 41. Editorial split section

Часто используемый паттерн:

```
7 cols photo
1 col empty/gap
4 cols text
```

Следующая секция может быть зеркальной:

```
4 cols text
1 gap
7 cols photo
```

Это создает ритм.

---

# 42. Full-width image break

Каждые 3–4 смысловые секции допустима full-width фотография.

Height:

desktop `520–680px`.

Mobile:

`420–520px`.

На фото можно разместить максимум:

- heading;
    
- 2 строки текста;
    
- 1 CTA.
    

---

# 43. Horizontal rhythm

Не выравнивать каждый текст по одной вертикальной линии на протяжении всей страницы.

Editorial-сайт должен иметь controlled asymmetry.

Но основные anchors должны следовать container grid.

---

# 44. Footer

Background:

Forest 900.

Text primary:

White.

Text secondary:

rgba(255,255,255,.65).

Padding desktop:

`80px 0 32px`.

Mobile:

`64px 0 24px`.

Footer logo:

light version.

Heading:

serif 40–48px.

Bottom divider:

rgba white .14.

---

# 45. Mobile navigation

Full-screen overlay.

Background:

Ivory.

Menu items:

serif `34px`.

Vertical gap:

`20px`.

Top:

logo + close.

Bottom:

contact;  
social;  
CTA.

Animation:

fade + slideY `12px`.

Duration:

`240–320ms`.

---

# 46. Sticky mobile CTA

Допустимо после 30–40% первого экрана.

Bottom:

`12px`.

Left/right:

`16px`.

Height:

`52px`.

Shadow:

очень мягкая.

Не показывать одновременно со sticky CTA там, где пользователь находится внутри формы.

---

# 47. Breakpoints

```
xs: 320px
sm: 480px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1600px
```

Основные design breakpoint:

Mobile:

`< 768`

Tablet:

`768–1023`

Desktop:

`1024+`

Large desktop:

`1440+`

---

# 48. Motion system

Главное ощущение:

медленно;  
спокойно;  
инерционно;  
не демонстративно.

---

## 48.1. Default transition

```
180ms ease-out
```

---

## 48.2. Image hover

```
450–600ms
cubic-bezier(.2,.7,.2,1)
```

---

## 48.3. Fade-up

Initial:

```
opacity: 0
transform: translateY(18px)
```

Final:

```
opacity: 1
transform: translateY(0)
```

Duration:

`500–700ms`.

---

## 48.4. Stagger

`60–90ms`.

Не делать stagger более 5 элементов подряд.

---

# 49. Scroll animation

Не анимировать весь сайт.

Анимировать:

- section intro;
    
- крупные photos;
    
- service cards;
    
- horse cards;
    
- quote;
    
- CTA.
    

Не анимировать:

- длинный body text;
    
- FAQ rows;
    
- цены;
    
- footer nav.
    

---

# 50. Parallax

Максимальный диапазон:

`20–36px`.

Очень медленно.

Не использовать aggressive parallax.

---

# 51. Hover

Desktop hover должен быть практически незаметным.

Button:

color transition.

Image:

scale 1.02.

Link arrow:

translate 4px.

Card:

никаких `translateY(-8px)`.

Максимально допустимо:

`translateY(-2px)`.

---

# 52. Cursor

Обычный system cursor.

Custom cursor не использовать.

---

# 53. Accessibility

Минимальный контраст body text:

WCAG AA.

Не размещать светлый текст на фотографии без overlay.

Touch target:

минимум `44 × 44px`.

Focus-visible обязателен.

Не удалять outline без альтернативного focus ring.

---

# 54. Reduced motion

Поддерживать:

```
@media (prefers-reduced-motion: reduce)
```

Отключать:

- parallax;
    
- animated scrolling;
    
- scale animation;
    
- stagger.
    

---

# 55. Content density

На одном desktop viewport не должно находиться слишком много информации.

Ориентир:

один сильный смысл на один экран.

Не делать:

- четыре заголовка;
    
- шесть CTA;
    
- семь иконок;
    
- большой текст;
    
- форму;
    

одновременно в одной секции.

---

# 56. CTA hierarchy

На экран:

1 primary CTA максимум.

Допустимо дополнительно:

1 secondary CTA.

Не использовать 3 одинаково сильные кнопки.

---

# 57. CTA copy

Коротко и конкретно.

Хорошо:

- Записаться
    
- Выбрать занятие
    
- Познакомиться с клубом
    
- Посмотреть лошадей
    
- Узнать цены
    
- Построить маршрут
    
- Написать нам
    

Плохо:

- Подробнее
    
- Нажмите здесь
    
- Узнать больше
    
- Перейти
    

---

# 58. Image + text rhythm

Нельзя делать:

image left / text right

на протяжении всех секций.

Использовать:

- split;
    
- asymmetric;
    
- full-width;
    
- text-only;
    
- carousel;
    
- quote;
    
- image break.
    

---

# 59. Card usage

Карточка разрешена только если контент представляет независимую сущность.

Да:

- лошадь;
    
- тренер;
    
- услуга;
    
- отзыв;
    
- направление.
    

Нет:

- «о клубе»;
    
- философия;
    
- контактная информация;
    
- заголовки секций;
    
- обычный текст.
    

---

# 60. Section background rotation

Пример визуального ритма:

```
Hero — image
Services — Ivory
About — Sand 200
Horses — Ivory
Full image — photography
Trainers — Ivory
Prices — Sage 200
Reviews — Ivory
FAQ — Ivory
Contact CTA — Forest
Footer — Forest
```

Не делать каждую секцию разноцветной.

---

# 61. Dark sections

Dark section:

Forest 900.

Headings:

White.

Body:

rgba white `.78`.

Muted:

rgba white `.58`.

Border:

rgba white `.16`.

CTA:

Ivory background;  
Forest text.

---

# 62. Editorial number / statistics

Если появляются факты:

```
8 лет
опыта
```

Number:

serif `64–72px`.

Description:

14px.

Не превращать в KPI dashboard.

---

# 63. Carousel

Использовать для:

- horses;
    
- gallery;
    
- testimonials.
    

Desktop:

показывать 2.5–3.5 cards.

Следующая карточка должна быть частично видна.

Controls:

circle `44px`.

Border:

1px border.

Mobile:

native swipe.

Scroll snap.

---

# 64. Carousel arrows

Background:

Surface White.

Icon:

Forest.

Radius:

999px.

Hover:

Forest bg + White icon.

---

# 65. Gallery

Избегать masonry с 20 изображениями.

Лучший формат:

- 1 large;
    
- 2 small;
    
- 1 medium.
    

Или horizontal carousel.

---

# 66. Empty space

Whitespace — активная часть композиции.

Если агент сомневается между:

добавить элемент

или

оставить воздух,

предпочитать воздух.

---

# 67. Header logo interaction

Logo ведет на `/`.

Не добавлять tooltip.

---

# 68. Price typography

Цена всегда sans-serif.

Не serif.

Пример:

`5 000 ₽`

Font:

Manrope 500.

Использовать неразрывный пробел между цифрой и ₽.

---

# 69. Number formatting

Использовать:

`2 500 ₽`

не:

`2500р`

не:

`2,500 RUB`.

---

# 70. Phone format

`+7 981 838-48-31`

---

# 71. Address format

Не длинной строкой в одну линию.

Пример:

```
Иннолово,
Ленинградская область
```

---

# 72. Map section

Map radius:

`16px`.

Map UI должен быть визуально приглушенным.

Если используется external map embed — по возможности минимизировать лишний UI.

---

# 73. Modal

Max width:

`560px`.

Padding:

desktop `40px`.

Mobile `24px`.

Radius:

`16px`.

Close:

44px clickable area.

Heading:

serif `36px`.

---

# 74. Booking modal

Порядок:

1. Заголовок

2. Подзаголовок

3. Имя

4. Телефон

5. Комментарий

6. CTA

7. Consent


Не задавать слишком много вопросов.

Выбранные услуга, тариф, лошадь и текущий route являются контекстом открытия формы. Они показываются пользователю как краткая неизменяемая строка над полями и добавляются в `comment`; отдельные поля, отсутствующие в payload callback API, не отправляются.

---

# 75. Consent

Text:

12–13px.

Muted.

Ссылка underline.

---

# 76. Toast

Bottom right desktop.

Bottom center mobile.

Background:

Forest.

Text:

White.

Radius:

10px.

Padding:

14px 18px.

---

# 77. Skeleton / loading

Background:

Sand 200.

Animation:

медленный subtle shimmer.

Не использовать яркие серые placeholders.

---

# 78. Photography art direction

Главные темы:

### Connection

прикосновение;  
взгляд;  
контакт.

### Movement

ходьба;  
езда;  
волосы;  
грива.

### Place

лес;  
поля;  
конюшня;  
манеж.

### Detail

седло;  
руки;  
шерсть;  
амуниция.

### Character

индивидуальные портреты лошадей.

---

# 79. Фото запрещённого характера

Избегать:

- слишком яркого HDR;
    
- постановочного luxury;
    
- неестественно белых зубов;
    
- пластикового skin retouch;
    
- огромных логотипов на экипировке;
    
- stock-smile;
    
- overly cinematic teal-orange;
    
- тяжелой виньетки.
    

---

# 80. Video

Hero video допустимо.

Формат:

5–10 секунд loop.

Без звука.

Без резких cuts.

FPS:

24–30.

Видео должно быть фоновой атмосферой, не роликом.

Обязательно poster image.

---

# 81. Logo animation

Не требуется.

Если есть:

только opacity/fade.

---

# 82. Visual keywords для генеративного дизайнера

При генерации визуальных решений использовать следующие определения:

```
editorial
quiet luxury
equestrian lifestyle
warm natural light
European countryside
soft ivory
deep forest green
organic composition
refined serif typography
restrained UI
premium but approachable
documentary photography
slow living
boutique hospitality
natural textures
quiet confidence
```

---

# 83. Anti-keywords

Не использовать:

```
cowboy
western
rustic farm
barn wood
gold luxury
royal
ornamental
victorian
sport racing
neon
bright gradients
glassmorphism
SaaS
dashboard
cartoon
children's amusement
corporate
tech startup
```

---

# 84. Desktop homepage composition

Рекомендуемая последовательность:

```
01 Header
02 Fullscreen Hero
03 Compact trust/features strip
04 Services / formats
05 Philosophy
06 Horses
07 Full-width emotional image
08 Trainers
09 Prices
10 Testimonial
11 FAQ
12 Contact / map
13 Final CTA
14 Footer
```

---

# 85. Hero layout exact example

Desktop:

```
Title width: 650px
Title bottom offset: 176px
Subtitle width: 520px
Subtitle margin-top: 24px
Actions margin-top: 32px
Button gap: 12px
```

---

# 86. Services section exact spacing

```
Section padding-top: 144px
Label
16px
Heading
24px
Intro
64px
Cards
```

Card gap:

`24px`.

---

# 87. Horses section exact spacing

```
Heading
16px
Description
48px
Carousel
```

Card image → name:

`20px`.

Name → description:

`8px`.

---

# 88. Desktop visual width rules

Hero headline:

max `700px`.

Main section intro:

max `760px`.

Body block:

max `620px`.

Quote:

max `900px`.

Never растягивать paragraph на всю ширину 1360px.

---

# 89. Mobile rules

На mobile:

- убрать декоративные элементы, если они мешают контенту;
    
- сохранить крупные фото;
    
- не уменьшать всё пропорционально;
    
- все text/image split перестраивать в вертикальный flow;
    
- фотографии показывать после соответствующего текста;
    
- button чаще full width только для основного CTA.
    

---

# 90. Mobile spacing

Page padding:

`20px`.

Heading → text:

`20px`.

Text → CTA:

`24px`.

Section gap:

`72px`.

Cards:

`16px`.

---

# 91. Mobile cards

Width:

`86–90vw` для swipe carousel.

Это позволяет видеть часть следующей карточки.

---

# 92. Touch interactions

На mobile нет hover-dependent content.

Вся важная информация должна быть видима без hover.

---

# 93. Desktop hover horse card

Hover может показывать:

- второе фото;
    
- 1 дополнительную строку;
    
- arrow.
    

Но имя и основная характеристика должны быть видны всегда.

---

# 94. Responsive image crop

Для каждой hero/editorial photo должны предусматриваться:

- desktop crop;
    
- tablet crop;
    
- mobile crop.
    

Не полагаться только на одинаковый `object-position`.

---

# 95. Visual priority

Если элемент не помогает:

- понять клуб;
    
- почувствовать атмосферу;
    
- выбрать услугу;
    
- повысить доверие;
    
- записаться;
    

его, скорее всего, не нужно добавлять.

---

# 96. Правило одного акцента

На одном viewport должен быть один главный визуальный акцент.

Например:

- фото;
    
- quote;
    
- heading;
    
- horse portrait.
    

Не несколько одновременно.

---

# 97. Contrast hierarchy

Основной hierarchy:

### Level 1

Hero image / headline.

### Level 2

Section heading.

### Level 3

Photo/card.

### Level 4

Body.

### Level 5

Meta / auxiliary.

---

# 98. Content surface hierarchy

Использовать поверхности:

```
Ivory
White
Sand
Sage
Forest
Photo
```

Этого достаточно.

Не вводить дополнительные random colors.

---

# 99. Final visual check

Перед завершением любой страницы проверить:

- достаточно ли воздуха;
    
- не слишком ли много карточек;
    
- нет ли SaaS-паттернов;
    
- не слишком ли круглый UI;
    
- нет ли ярких акцентов;
    
- есть ли крупная фотография;
    
- чувствуется ли лошадь как личность;
    
- выглядит ли сайт как место, куда хочется приехать;
    
- есть ли один понятный CTA;
    
- остается ли сайт премиальным без ощущения снобизма.
    

---

# 100. Краткий master prompt для UI-агента

Создавай интерфейс как современный премиальный сайт европейского конного клуба. Используй тёплый ivory фон, глубокий forest green, натуральные sand/sage акценты, крупную editorial serif-типографику и спокойный sans-serif для UI. Композиция должна быть просторной, асимметричной и фотографичной. Основной эмоциональный инструмент — крупные натуральные фотографии людей, лошадей и природы. Избегай SaaS-карточек, ярких цветов, cowboy/rustic эстетики, чрезмерно круглого UI, тяжёлых теней, градиентов и декоративных horse-patterns. Интерфейс должен ощущаться как boutique hospitality + equestrian lifestyle + quiet luxury. Радиусы сдержанные 8–16 px, кнопки прямоугольные с мягкими углами, движения медленные и минимальные. Главная цель дизайна — создать желание приехать в клуб, познакомиться с лошадьми и почувствовать атмосферу.

---

# 101. Сквозные контракты реализации

Этот раздел уточняет поведение вариативного CMS-контента. Источники данных, ключи `site_settings` и page compositions определены в `scheme.md` и `components.md`; здесь фиксируются только presentation rules.

## 101.1. Варианты header

- `hero-transparent`: только над полноэкранным тёмным hero; светлые logo, navigation и controls, контраст проверяется на реальном crop изображения.
- `surface`: для внутренних страниц без full-bleed hero и после scroll; ivory blur surface и тёмные controls.
- Переход в `surface` не меняет ширину контента и не вызывает layout shift. При недоступном hero или недостаточном контрасте начальное состояние сразу `surface`.
- Desktop содержит logo, navigation, phone и один primary CTA. Mobile содержит logo, call action и menu trigger; остальные пункты находятся в overlay.
- Активный route отмечается не только цветом. CMS может менять подписи и порядок разрешённых ссылок, но не геометрию, breakpoint и access pattern header.

## 101.2. Варианты footer

- `standard` — единственный основной вариант: brand/description, navigation, contacts/social links и нижняя legal строка.
- Отсутствующий optional контент схлопывает свой блок без пустой колонки; оставшиеся блоки перераспределяются по сетке. Неизвестные часы работы не заменяются выдуманным расписанием.
- На desktop используются до трёх колонок; на mobile порядок фиксирован: brand → navigation → contacts/social → legal.
- Длинные адрес, часы и CMS-подписи переносятся, но не обрезаются. Телефон и внешние ссылки сохраняют видимый focus и понятное accessible name.

## 101.3. Универсальная callback form

- Все CTA открывают один modal и передают видимый контекст: route и, если есть, услугу, тариф или лошадь.
- Payload ограничен `name?`, обязательным `phone` и `comment?`; контекст дописывается в comment, не создавая неподдерживаемых API-полей.
- Consent обязателен до отправки: checkbox не предвыбран, ссылка на политику доступна с клавиатуры, отсутствие согласия даёт inline error и переводит focus к consent.
- `idle`: поля доступны; `pending`: значения и геометрия сохраняются, submit заблокирован и обозначен как занятый; `success`: форма заменяется подтверждением и явной кнопкой закрытия.
- Validation/`4xx` сохраняет введённые значения и показывает ошибки рядом с полями; network/`5xx` даёт retry; `401` объясняется как ошибка конфигурации сайта без login UI. Повторный submit во время pending невозможен.
- Dialog получает accessible name/description, удерживает focus, закрывается по `Escape` (кроме момента необратимого submit) и возвращает focus исходному CTA. Mobile modal не перекрывается sticky CTA и учитывает safe area и экранную клавиатуру.

## 101.4. Непредсказуемая длина CMS-контента

- Заголовки и основной текст не обрезаются ellipsis. Контейнер растёт по содержимому; строки переносятся по словам, длинные URL — безопасно разрываются.
- Card grid выравнивает media и CTA, но не задаёт общей фиксированной высоты тексту. Для длинного описания используется явное раскрытие «Подробнее», доступное с клавиатуры; критичные условия и цены не скрываются.
- Пустой optional текст не создаёт пустого отступа. Пустой обязательный заголовок получает документированный fallback из page composition.
- Navigation labels проходят разрешённый список routes; если подписи не помещаются на desktop, уменьшается gap до заданного минимума, затем включается compact/mobile navigation — размер текста ниже token не уменьшается.
- Табличные цены на узком экране превращаются в пары label/value либо получают обозначенный горизонтальный scroll. Значения, валюты и единицы измерения не разрываются на разные строки.

## 101.5. Единый state contract

- `loading` резервирует итоговую геометрию; количество skeleton соответствует ожидаемой первой порции, shimmer отключается при reduced motion.
- `empty` сообщает отсутствие обязательного каталога и сохраняет полезный CTA; необязательная редакционная секция может полностью скрыться без пустого фона или divider.
- `error` локален блоку, не удаляет уже загруженные данные и предоставляет retry там, где повторный запрос возможен.
- `success` подтверждает завершённое действие текстом, а не только цветом или toast. Toast дополняет, но не заменяет постоянный результат формы.
- `disabled` применяется только к действительно недоступному действию, визуально отличается от hover/pressed и сохраняет объясняющую подпись. Для ожидания запроса используется также `aria-busy`.

## 101.6. Responsive acceptance criteria

- Контрольные диапазоны: `320–767`, `768–1023`, `1024–1439`, `1440+`; отдельная проверка обязательна на ширинах 320, 768, 1024 и 1440 px.
- На любой ширине отсутствуют горизонтальный scroll страницы, перекрытие текста, обрезанные focus rings и CTA поверх контента. Исключение — явно обозначенный внутренний scroll таблицы/карусели.
- Text/media split на mobile становится последовательным flow «текст → связанное медиа»; DOM-порядок остаётся логичным без CSS-переупорядочивания смысла.
- Touch target не меньше `44 × 44px`; sticky CTA учитывает `env(safe-area-inset-bottom)` и не конкурирует с modal, form или footer CTA.
- Hero использует отдельный проверенный crop/focal point для mobile; текст и CTA остаются в safe contrast zone при каждом разрешённом CMS media.

## 101.7. Accessibility acceptance criteria

- На странице один `h1`; иерархия заголовков последовательна, landmarks и navigation имеют доступные имена.
- Все действия доступны клавиатурой в логичном DOM-порядке; `focus-visible` различим на ivory, forest, photo overlay и modal surface.
- Body text, controls и meaningful icons соответствуют WCAG AA; информация, validation и active state не кодируются одним цветом.
- Meaningful images имеют содержательный alt из CMS или безопасный fallback; декоративные изображения получают пустой alt. Имя файла и marketing keyword stuffing не используются как alt.
- Async-обновления сообщаются через polite live region; ошибки отправки — через alert. Уведомление не повторяется одновременно несколькими screen-reader regions.
- При zoom 200% и увеличенном системном тексте контент не теряется, modal остаётся прокручиваемым, а fixed controls не перекрывают активное поле.
- При `prefers-reduced-motion` интерфейс остаётся полностью понятным без parallax, scale, stagger, animated scroll и обязательных transition cues.

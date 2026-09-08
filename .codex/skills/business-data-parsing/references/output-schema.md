# Схема результата

Используй минимальный набор ниже и добавляй файлы только при наличии соответствующих данных.

```text
docs/parsings/<business-slug>/
├── README.md
├── business.json
├── services.json
├── content.json
├── reviews.json
├── branding.md
├── sources.md
├── media-manifest.json
└── media/
    ├── official-site/
    ├── maps/
    └── <social-platform>/
```

`reviews.json` и `branding.md` создавай только при наличии соответствующих данных.

## README.md

Кратко опиши назначение набора, дату сбора, состав файлов, ключевые факты, ограничения и список вопросов владельцу. Обязательно предупреди, что данные и права на медиа необходимо подтвердить перед публикацией.

## business.json

Рекомендуемые поля:

```json
{
  "collected_at": "YYYY-MM-DD",
  "name": "Название",
  "alternate_names": [],
  "description": "",
  "official_site": "https://…",
  "socials": {},
  "contacts": {
    "phones": [{"value": "+70000000000", "formatted": "+7 (000) 000-00-00", "sources": ["official_site"]}],
    "email": null,
    "people": []
  },
  "location": {"address": "", "coordinates": {"latitude": 0, "longitude": 0}},
  "working_hours": {},
  "categories": [],
  "features": [],
  "rating": {},
  "source_conflicts": []
}
```

Сохраняй дополнительные source-specific метрики, если они полезны для миграции, но не смешивай их с основной карточкой.

## services.json

Разделяй каталоги по источникам. Элемент услуги должен по возможности содержать `title`, `description`, `price_value`, `currency`, `price_text`, `details`, `source`, `source_url` и `collected_at`. Сверху добавь предупреждение о необходимости подтвердить цены.

## content.json

Собери переиспользуемые текстовые блоки: hero, positioning, benefits, CTA, team copy и подтверждённые факты. Выводы из отзывов держи в отдельном `review_derived_topics` и не выдавай за официальный текст.

## reviews.json

Храни source/business ID, дату сбора, заявленное и фактическое число отзывов. Для каждого отзыва сохраняй доступные ID, автора, рейтинг, дату, текст, ответ бизнеса, реакции и ссылки на фото/видео. Не редактируй смысл и не исправляй авторскую орфографию в сыром поле `text`.

## media-manifest.json

```json
{
  "collected_at": "YYYY-MM-DD",
  "files_count": 1,
  "files": [{
    "path": "media/official-site/hero.jpg",
    "source": "official_site",
    "source_url": "https://…/hero.jpg",
    "bytes": 123,
    "sha256": "…",
    "mime_type": "image/jpeg",
    "dimensions": "1920x1080"
  }],
  "remote_video_references": []
}
```

`files_count` должен равняться числу элементов `files` и фактическому числу локальных файлов, включённых в manifest.

## sources.md

Для каждого заданного и дополнительного источника укажи URL, дату, статус покрытия, что собрано, что недоступно и почему. Здесь же фиксируй юридические/лицензионные предупреждения и различие между данными владельца и пользовательским контентом.

## branding.md

Разделяй наблюдаемую айдентику и рекомендации. Зафиксируй палитру, типографику, формы, композицию, фотостиль и наличие логотипа. Не называй извлечённые из шаблона цвета официальным брендбуком без подтверждения владельца.

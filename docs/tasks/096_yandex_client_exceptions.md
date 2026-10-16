# Единая обработка ошибок клиентов Яндекс

## Исходный запрос (дословно)

«Мы будем работать в сервисе yandex и ya-metrica. В yandex есть клиент Яндекс для авторизации пользователей src/clients/yandex_oauth_client.py. В ya-metrica есть клиент Яндекс для работы с метрикой. Нам нужно обработать исключения следующим образом: В src/core/exceptions/yandex.py в сервисе yandex есть исключение. Только его должен выбрасывать клиент при любой неудаче. Сервис должен обрабатывать это исключение и преобразовывать в ClientError. В том числе при timeout. Микросервисы сами не должны ничего возвращать кроме 200, 204 и 400».

## Планирование

- Execution unit: PLAN-1, только планирование, согласие на реализацию не получено.
- Фактические сервисы по `services.manifest`: `services/yandex-service`, `services/ya-metrica-service`; в `SERVICES.md` записи этих сервисов отсутствуют.
- OpenSpec change: [normalize-yandex-client-failures](../../openspec/changes/normalize-yandex-client-failures/proposal.md).
- Спорные границы HTTP-контракта и доступа рассматриваются в change; этот файл сохраняет входной запрос, а не заменяет изменяемый план.

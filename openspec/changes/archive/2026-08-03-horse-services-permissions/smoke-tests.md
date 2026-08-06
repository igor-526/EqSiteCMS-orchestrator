# Smoke тесты для horse services permissions

## Access Matrix

| Endpoint | Method | Access Class | Expected without auth | Expected with DEVELOPER | Expected with ADMIN |
|----------|--------|--------------|----------------------|------------------------|---------------------|
| `/horses/services` | GET | Public Read | 200 | 200 | 200 |
| `/horses/services/{slug_or_id}` | GET | Public Read | 200 | 200 | 200 |
| `/horses/services` | POST | Protected Write | 401/403 | 200 | 403 |
| `/horses/services/{slug_or_id}` | PATCH | Protected Write | 401/403 | 200 | 403 |
| `/horses/services/{slug_or_id}` | DELETE | Protected Write | 401/403 | 204 | 403 |
| `/horses?service_names=...` | GET | Public Read | 200 | 200 | 200 |

## Smoke тесты

### 7.1 Smoke: `POST /horses/services` с `DEVELOPER` scope возвращает `200`
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -b <cookie_jar> \
  -X POST "<base_url>/horses/services" \
  -H "Content-Type: application/json" \
  -d '{"name": "Тестовая услуга", "price": 1000}'
```
Ожидаемый результат: `200`

### 7.2 Smoke: `POST /horses/services` с `SUPERUSER` scope возвращает `200`
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -b <cookie_jar_superuser> \
  -X POST "<base_url>/horses/services" \
  -H "Content-Type: application/json" \
  -d '{"name": "Тестовая услуга 2", "price": 2000}'
```
Ожидаемый результат: `200`

### 7.3 Smoke: `POST /horses/services` с `ADMIN` scope возвращает `403`
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -b <cookie_jar_admin> \
  -X POST "<base_url>/horses/services" \
  -H "Content-Type: application/json" \
  -d '{"name": "Тестовая услуга 3", "price": 3000}'
```
Ожидаемый результат: `403`

### 7.4 Smoke: `POST /horses/services` без авторизации возвращает `401`/`403`
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "<base_url>/horses/services" \
  -H "Content-Type: application/json" \
  -d '{"name": "Тестовая услуга 4", "price": 4000}'
```
Ожидаемый результат: `401` или `403`

### 7.5 Smoke: `PATCH /horses/services/{slug_or_id}` с `DEVELOPER` scope возвращает `200`
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -b <cookie_jar> \
  -X PATCH "<base_url>/horses/services/testovaya-usluga" \
  -H "Content-Type: application/json" \
  -d '{"name": "Обновленная услуга"}'
```
Ожидаемый результат: `200`

### 7.6 Smoke: `PATCH /horses/services/{slug_or_id}` с `ADMIN` scope возвращает `403`
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -b <cookie_jar_admin> \
  -X PATCH "<base_url>/horses/services/testovaya-usluga" \
  -H "Content-Type: application/json" \
  -d '{"name": "Попытка обновления"}'
```
Ожидаемый результат: `403`

### 7.7 Smoke: `DELETE /horses/services/{slug_or_id}` с `DEVELOPER` scope возвращает `204`
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -b <cookie_jar> \
  -X DELETE "<base_url>/horses/services/testovaya-usluga-2"
```
Ожидаемый результат: `204`

### 7.8 Smoke: `DELETE /horses/services/{slug_or_id}` с `ADMIN` scope возвращает `403`
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -b <cookie_jar_admin> \
  -X DELETE "<base_url>/horses/services/testovaya-usluga"
```
Ожидаемый результат: `403`

### 7.9 Smoke: `GET /horses/services` с `ADMIN` scope возвращает `200`
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -b <cookie_jar_admin> \
  "<base_url>/horses/services"
```
Ожидаемый результат: `200`

### 7.10 Smoke: `GET /horses/services/{slug_or_id}` с `ADMIN` scope возвращает `200`
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -b <cookie_jar_admin> \
  "<base_url>/horses/services/testovaya-usluga"
```
Ожидаемый результат: `200`

### 7.11 Smoke: `GET /horses?service_names=Разведение` возвращает отфильтрованный список лошадей
```bash
curl -s -b <cookie_jar> "<base_url>/horses?service_names=Разведение" | python3 -m json.tool
```
Ожидаемый результат: `200`, список лошадей с услугой "Разведение"

### 7.12 Smoke: `GET /horses?service_names=НесуществующаяУслуга` возвращает пустой список
```bash
curl -s -b <cookie_jar> "<base_url>/horses?service_names=НесуществующаяУслуга" | python3 -m json.tool
```
Ожидаемый результат: `200`, `total=0`

### 7.13 Smoke: `GET /horses?service_names=продажа` возвращает только лошадей с услугой "продажа"
```bash
curl -s -b <cookie_jar> "<base_url>/horses?service_names=продажа" | python3 -m json.tool
```
Ожидаемый результат: `200`, только лошади с услугой "продажа" (не "продажа и аренда")

### 7.14 Smoke: `GET /horses?service_names=РАЗВЕДЕНИЕ` возвращает лошадей с услугой "разведение"
```bash
curl -s -b <cookie_jar> "<base_url>/horses?service_names=РАЗВЕДЕНИЕ" | python3 -m json.tool
```
Ожидаемый результат: `200`, лошади с услугой "разведение" (регистронезависимо)

### 7.15 Smoke: cleanup удаляет созданные записи из реальной PostgreSQL через API
```bash
# Удаляем созданные тестовые услуги
curl -s -o /dev/null -w "%{http_code}" \
  -b <cookie_jar> \
  -X DELETE "<base_url>/horses/services/testovaya-usluga"
```
Ожидаемый результат: `204`

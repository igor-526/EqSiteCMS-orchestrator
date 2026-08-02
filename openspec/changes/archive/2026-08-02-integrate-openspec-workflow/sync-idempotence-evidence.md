# Evidence идемпотентности повторной sync

Дата проверки: 2026-08-02.

## Область проверки

Проверка пытается повторно применить архивные delta specs шести capability-пакетов к копии текущих main specs и подтверждает, что их содержимое не меняется. OpenSpec 1.5.0 не предоставляет отдельную команду `sync` или dry-run: для уже добавленных требований повторный `archive` ожидаемо завершается диагностикой `archive_spec_update_failed` / `already exists` / `No files were changed.`. Поэтому эквивалентом идемпотентной sync служит одновременная проверка этой диагностики и неизменности SHA-256 всех main specs.

- `backend-access-platform`;
- `backend-domain-capabilities`;
- `cms-content-commerce-ui`;
- `cms-horse-ui-quality`;
- `repository-process-tooling`;
- `site-consumer-contracts`.

Рабочая копия создаётся внутри активного change, не использует `/tmp` и удаляется при завершении команды. Исходные `openspec/specs/**` и архивные changes команда не изменяет.

## Воспроизводимая команда

Запускать из корня репозитория:

```bash
set -eu
check_root="$(realpath "$(mktemp -d openspec/changes/integrate-openspec-workflow/.sync-check.XXXXXX)")"
trap 'find "$check_root" -depth -delete' EXIT
mkdir -p "$check_root/openspec/changes" "$check_root/openspec/specs"
cp openspec/config.yaml "$check_root/openspec/config.yaml"
cp -R openspec/specs/. "$check_root/openspec/specs/"

for package in \
  backend-access-platform \
  backend-domain-capabilities \
  cms-content-commerce-ui \
  cms-horse-ui-quality \
  repository-process-tooling \
  site-consumer-contracts
do
  source_dir="$(find openspec/changes/archive -maxdepth 1 -type d -name "*-backfill-$package" -print -quit)"
  test -n "$source_dir"
  cp -R "$source_dir" "$check_root/openspec/changes/backfill-$package"
done

(
  cd "$check_root"
  sha256sum openspec/specs/*/spec.md > before.sha256
  for package in \
    backend-access-platform \
    backend-domain-capabilities \
    cms-content-commerce-ui \
    cms-horse-ui-quality \
    repository-process-tooling \
    site-consumer-contracts
  do
    if openspec archive "backfill-$package" --yes --json > "archive-$package.json"
    then
      echo "Повторная sync неожиданно завершилась успешно: $package" >&2
      exit 1
    fi
    grep -q 'archive_spec_update_failed' "archive-$package.json"
    grep -q 'No files were changed' "archive-$package.json"
  done
  sha256sum openspec/specs/*/spec.md > after.sha256
  diff -u before.sha256 after.sha256
  cat after.sha256
)
```

Условие успеха: все шесть повторных `openspec archive` отклоняются до записи файлов с ожидаемой диагностикой, `diff` не выводит различий и итоговые SHA-256 совпадают с приведёнными ниже. Любой неожиданный успешный archive, иная ошибка либо изменение main spec завершает команду с ненулевым кодом.

## Зафиксированный результат

Повторный запуск после исправления `Purpose` завершился с кодом `0`; path-scoped diff между снимками отсутствует:

```text
bad02e213b57b032d639696a91680dedf1f5d85a27008b29eab043eadb1564a8  openspec/specs/backend-access-platform/spec.md
04299544e670832e2bfb8cff1e0baf443232c1d43df7b44f9fd9ad510f9e85f1  openspec/specs/backend-domain-capabilities/spec.md
7cfbbb2623e79a54c0d2e7cf7bcd5e30c32049066d9d8958baab7c3bd3fd59db  openspec/specs/cms-content-commerce-ui/spec.md
2b5c76e78bc1e6c1ec3e4b56071b839be62f425ecae1ebde3631024f133c897a  openspec/specs/cms-horse-ui-quality/spec.md
edd0a6823c6ff75f7cd9cb752d65ad78fb599e16c8a80a053cfd3ffdb12d737d  openspec/specs/repository-process-tooling/spec.md
36b08afd92431662bb3b63e367ee7787547cfbe654c443dd51dac9c16bc9962d  openspec/specs/site-consumer-contracts/spec.md
```

Полная проверка OpenSpec после повторной sync:

```bash
openspec validate --all --strict --json
```

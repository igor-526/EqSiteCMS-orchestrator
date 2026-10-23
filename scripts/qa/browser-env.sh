# shellcheck shell=bash
# Подготовка окружения Playwright Chromium без sudo.
# Использование (в каждой команде, env не сохраняется между вызовами):
#   source scripts/qa/browser-env.sh && node scripts/qa/run-scenarios.mjs ...
# Выставляет PLAYWRIGHT_BROWSERS_PATH и, если Chromium не находит системные библиотеки,
# распаковывает их из apt-пакетов в .cache/browser-libs и добавляет в LD_LIBRARY_PATH.

_eq_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$_eq_root/.cache/ms-playwright}"
_eq_libroot="$_eq_root/.cache/browser-libs"
_eq_libdir="$_eq_libroot/root/usr/lib/x86_64-linux-gnu"

_eq_missing() {
  local bin
  for bin in "$PLAYWRIGHT_BROWSERS_PATH"/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell \
             "$PLAYWRIGHT_BROWSERS_PATH"/chromium-*/chrome-linux64/chrome; do
    [ -x "$bin" ] || continue
    LD_LIBRARY_PATH="$_eq_libdir${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" ldd "$bin" 2>/dev/null | grep -q 'not found' && return 0
  done
  return 1
}

if _eq_missing; then
  if command -v apt >/dev/null && command -v dpkg-deb >/dev/null; then
    mkdir -p "$_eq_libroot/packages" "$_eq_libroot/root"
    (
      cd "$_eq_libroot/packages" || exit 1
      for pkg in libnspr4 libnss3 libasound2t64 libasound2; do
        ls "${pkg}"_*.deb >/dev/null 2>&1 || apt download "$pkg" >/dev/null 2>&1 || true
      done
      for deb in ./*.deb; do [ -f "$deb" ] && dpkg-deb -x "$deb" "$_eq_libroot/root"; done
    )
  else
    echo "browser-env: нет apt/dpkg-deb для распаковки библиотек Chromium" >&2
  fi
fi

if [ -d "$_eq_libdir" ]; then
  case ":${LD_LIBRARY_PATH:-}:" in
    *":$_eq_libdir:"*) ;;
    *) export LD_LIBRARY_PATH="$_eq_libdir${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" ;;
  esac
fi

if _eq_missing; then
  echo "browser-env: Chromium всё ещё не находит библиотеки (ldd ... | grep 'not found')" >&2
fi
unset -f _eq_missing
unset _eq_root _eq_libroot _eq_libdir

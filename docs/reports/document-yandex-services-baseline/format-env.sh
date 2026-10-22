#!/bin/sh
# Source this file ONLY for the owned isolated snapshot. No quality command runs here.
FORMAT_BASE=/srv/eqSiteCMS/.qa/qg-format-document-yandex-services-baseline-v1
export PATH=/home/igor/.local/bin:/home/igor/.nvm/versions/node/v24.22.1/bin:/usr/bin:/bin
export HOME="$FORMAT_BASE/home"
export TMPDIR="$FORMAT_BASE/tmp"
export XDG_CACHE_HOME="$FORMAT_BASE/xdg-cache"
export UV_CACHE_DIR="$FORMAT_BASE/uv-cache"
export npm_config_cache="$FORMAT_BASE/npm-cache"
export PLAYWRIGHT_BROWSERS_PATH="$FORMAT_BASE/browser-cache"
export UV_FROZEN=true
export UV_NO_SYNC=true
export UV_PYTHON_DOWNLOADS=never
export npm_config_offline=true
export npm_config_update_notifier=false
export GIT_OPTIONAL_LOCKS=0
unset UV_PROJECT_ENVIRONMENT

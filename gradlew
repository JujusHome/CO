#!/usr/bin/env sh
set -e
APP_HOME="$(cd "$(dirname "$0")" && pwd)"
exec gradle "$@"

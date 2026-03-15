#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

stow --target "$HOME" --dir "$repo_dir" "${packages[@]}"

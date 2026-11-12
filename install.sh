#!/usr/bin/env bash
set -euo pipefail

# Usage: install.sh [--force] [package...]
#
# --force  replaces existing files in $HOME that conflict with a package's
#          symlinks. The files to be overwritten are listed first and nothing
#          is touched unless the user confirms with 'y'.

force=false
args=()
for arg in "$@"; do
  case "$arg" in
    --force) force=true ;;
    *) args+=("$arg") ;;
  esac
done
# Hand only package names on to common.sh (the ${...+} guard keeps bash 3.2
# happy with an empty array under set -u).
set -- ${args[@]+"${args[@]}"}

# shellcheck source=common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_stow

if $force; then
  # Let Stow dry-run the install and report its conflicts, so the list of
  # files to overwrite matches exactly what Stow would refuse to replace.
  conflicts=()
  if ! output=$(stow --no --target "$HOME" --dir "$repo_dir" "${packages[@]}" 2>&1); then
    while IFS= read -r line; do
      case "$line" in
        *"existing target is not owned by stow: "*)
          conflicts+=("${line#*not owned by stow: }")
          ;;
        *" over existing "*"target "*)
          target="${line#* over existing }"
          target="${target#*target }"
          conflicts+=("${target% since *}")
          ;;
      esac
    done <<<"$output"

    if [[ ${#conflicts[@]} -eq 0 ]]; then
      echo "$output" >&2
      echo "Stow failed for a reason other than conflicting files (see above)." >&2
      exit 1
    fi
  fi

  if [[ ${#conflicts[@]} -gt 0 ]]; then
    echo "The following files in $HOME will be overwritten:"
    for target in "${conflicts[@]}"; do
      if [[ -d "$HOME/$target" && ! -L "$HOME/$target" ]]; then
        echo "  $HOME/$target/ (directory, including its contents)"
      else
        echo "  $HOME/$target"
      fi
    done

    answer=""
    read -r -p "Overwrite these files? [y/n] " answer || answer="n"
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
      echo "Aborted, nothing was changed."
      exit 1
    fi

    for target in "${conflicts[@]}"; do
      rm -rf -- "${HOME:?}/$target"
    done
  fi
fi

stow --target "$HOME" --dir "$repo_dir" "${packages[@]}"

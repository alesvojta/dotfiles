#!/usr/bin/env bash
set -euo pipefail

# Bootstraps a fresh machine: installs Homebrew dependencies from the
# Brewfile, then stows every package, offering to adopt any pre-existing
# real files that conflict with a symlink target.
#
# shellcheck source=common.sh
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required but not installed." >&2
  echo "Install it from https://brew.sh, then re-run this script." >&2
  exit 1
fi

brew bundle --file="$repo_dir/Brewfile"

stowed=()
skipped=()
failed=()

for package in "${packages[@]}"; do
  echo "==> Stowing $package"

  if output=$(stow --target "$HOME" --dir "$repo_dir" "$package" 2>&1); then
    stowed+=("$package")
    continue
  fi

  if grep -q -- '--adopt not specified' <<<"$output"; then
    echo "$output" >&2
    echo
    echo "Package '$package' conflicts with existing real file(s) in \$HOME (see above)."
    echo "Running with --adopt moves those existing files into $repo_dir/$package and replaces"
    echo "them with symlinks. This is destructive to their current location: if their content"
    echo "differs from what's already committed in the repo, it will show up as a local diff."
    answer=""
    read -r -p "Adopt existing file(s) for '$package'? [y/N] " answer || answer="n"
    if [[ "$answer" =~ ^[Yy]$ ]]; then
      stow --adopt --target "$HOME" --dir "$repo_dir" "$package"
      echo "Adopted '$package'. Review the result with 'git status' / 'git diff' in $repo_dir."
      stowed+=("$package")
    else
      echo "Skipping '$package'."
      skipped+=("$package")
    fi
  else
    echo "$output" >&2
    echo "Failed to stow '$package' (see error above)."
    failed+=("$package")
  fi
done

echo
echo "===== Summary ====="
echo "Stowed:  ${#stowed[@]} (${stowed[*]:-none})"
echo "Skipped: ${#skipped[@]} (${skipped[*]:-none})"
echo "Failed:  ${#failed[@]} (${failed[*]:-none})"

if [[ ${#skipped[@]} -gt 0 || ${#failed[@]} -gt 0 ]]; then
  exit 1
fi

# Common setup sourced by install.sh, uninstall.sh and bootstrap.sh.
# Expects: set -euo pipefail to be already set by the calling script.
# Provides: $repo_dir  – absolute path to the repo root
#           $packages  – array of package names to stow/unstow
#           require_stow – function that exits if GNU Stow is missing

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Exits unless GNU Stow is available. Called explicitly by each script, so
# bootstrap.sh can install Stow from the Brewfile before checking for it.
require_stow() {
  if ! command -v stow >/dev/null 2>&1; then
    echo "GNU Stow is required. Install with: brew install stow" >&2
    exit 1
  fi
}

cd "$repo_dir"

# Resolve packages: use CLI args if provided, otherwise discover top-level directories
if [[ $# -gt 0 ]]; then
  packages=("$@")
else
  packages=()
  for dir in */; do
    # Skip all hidden directories (starting with a dot, e.g. .git, .idea)
    [[ "$dir" == .* ]] && continue
    packages+=("${dir%/}")
  done
fi

if [[ ${#packages[@]} -eq 0 ]]; then
  echo "No packages found." >&2
  exit 1
fi


# Dotfiles (GNU Stow)

This repository uses GNU Stow to manage symlinks into your home directory.

## Requirements

- GNU Stow (`brew install stow`)
- [Homebrew](https://brew.sh)

## Usage

On a new machine, bootstrap Homebrew dependencies and stow everything in one go:

```
./bootstrap.sh
```

This installs Homebrew packages from `Brewfile`, then stows each package one at a time. If a
package conflicts with a real (non-symlink) file already in `$HOME`, it explains the conflict and
asks whether to run `stow --adopt` (which moves the existing file into the repo and replaces it
with a symlink) before continuing to the next package. It's safe to re-run.

Stow all packages (without touching Homebrew or handling conflicts):

```
./install.sh
```

Stow specific packages:

```
./install.sh git zsh
```

Unstow all packages:

```
./uninstall.sh
```

Unstow specific packages:

```
./uninstall.sh git zsh
```

## Packages

| Package      | Target file(s)                              |
|--------------|---------------------------------------------|
| `bettermouse`| `~/bettermouse.plist`                       |
| `ghostty`    | `~/.config/ghostty/config.ghostty`          |
| `git`        | `~/.gitconfig`, `~/.gitignore_global`       |
| `nvim`       | `~/.config/nvim/`                           |
| `ohmyposh`   | `~/.config/ohmyposh.toml`                   |
| `zsh`        | `~/.zshrc`                                  |

Add new packages by creating a top-level folder and placing dotfiles inside it.
Hidden directories (starting with `.`, e.g. `.git`, `.idea`) are automatically excluded.

## Structure

- `bootstrap.sh` – installs Homebrew deps from `Brewfile`, then stows packages with interactive
  conflict handling (adopting pre-existing real files on request)
- `install.sh` – stows packages into `$HOME`
- `uninstall.sh` – removes stowed symlinks from `$HOME`
- `common.sh` – shared logic used by all three scripts (package discovery, stow check)
- `Brewfile` – source of truth for Homebrew dependencies; regenerate with
  `brew bundle dump --force --file=Brewfile` after installing or removing something

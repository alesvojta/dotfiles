# Dotfiles (GNU Stow)

This repository uses GNU Stow to manage symlinks into your home directory.

## Requirements

- GNU Stow (`brew install stow`)

## Usage

Stow all packages:

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

- `install.sh` – stows packages into `$HOME`
- `uninstall.sh` – removes stowed symlinks from `$HOME`
- `common.sh` – shared logic used by both scripts (package discovery, stow check)

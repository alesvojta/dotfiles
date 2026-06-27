export ZSH="$HOME/.oh-my-zsh"
export PATH="$HOME/bin:$PATH"
export NODE_EXTRA_CA_CERTS="$HOME/company-ca.pem"

# Set JAVA{version}_HOME only if that JDK is installed
for _java_v in 17 21; do
  /usr/libexec/java_home -v $_java_v &>/dev/null && export JAVA${_java_v}_HOME=$(/usr/libexec/java_home -v $_java_v)
done
unset _java_v
# Prefer Java 21, fall back to 17, or leave unset
export JAVA_HOME=${JAVA21_HOME:-${JAVA17_HOME:-}}

ZSH_THEME=""
HIST_STAMPS="dd.mm.yyyy"

plugins=(git yarn zsh-autosuggestions zsh-syntax-highlighting zsh-completions fzf )
source $ZSH/oh-my-zsh.sh

if [ "$TERM_PROGRAM" != "Apple_Terminal" ]; then
  eval "$(oh-my-posh init zsh --config $HOME/.config/ohmyposh.toml)"
fi
# eval "$(starship init zsh)"
eval "$(zoxide init --cmd cd zsh)"
eval "$(fnm env --use-on-cd)"

# Fuzzy git branch switcher using fzf with a preview of the last 20 commits.
git_switch_fzf() {
  local branch
  branch=$(git branch --format="%(refname:short)" | \
    fzf --preview 'git log --graph --color=always --oneline -n 20 {}') || return
  git switch "$branch"
}
alias gco=git_switch_fzf

# Fuzzy file opener using fzf with a preview of the first 200 lines.
v() {
  local file
  file=$(fd --type f --hidden --exclude .git | \
    fzf --height=70% --layout=reverse --border --padding=1 \
        --preview 'bat --style=numbers --color=always --theme="Catppuccin Macchiato" {}') || return
  nvim "$file"
}

alias vi="nvim"
alias vim="nvim"
alias zshrc="nvim ~/.zshrc"
alias zshrcs="source ~/.zshrc"

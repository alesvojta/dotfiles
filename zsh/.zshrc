export ZSH="$HOME/.oh-my-zsh"
export PATH="$HOME/bin:$PATH"

export JAVA17_HOME=$(/usr/libexec/java_home -v 17)
export JAVA21_HOME=$(/usr/libexec/java_home -v 21)
export JAVA_HOME=$JAVA21_HOME

ZSH_THEME=""
HIST_STAMPS="dd.mm.yyyy"

plugins=(git yarn zsh-autosuggestions zsh-syntax-highlighting zsh-completions tmux fzf zoxide)
source $ZSH/oh-my-zsh.sh

eval "$(starship init zsh)"
eval "$(fnm env --use-on-cd)"

# Fuzzy git branch switcher using fzf with a preview of the last 20 commits.
git_switch_fzf() {
  local branch
  branch=$(git branch --format="%(refname:short)" | \
    fzf --preview 'git log --graph --color=always --oneline -n 20 {}') || return
  git switch "$branch"
}
alias gco=git_switch_fzf
alias v="fd --type f --hidden --exclude .git | fzf-tmux -p --reverse | xargs nvim"
alias vim="nvim"
alias zshrc="nvim ~/.zshrc"
alias zshrcs="source ~/.zshrc"

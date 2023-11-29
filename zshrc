export ZSH="$HOME/.oh-my-zsh"
export JAVA17_HOME=`/usr/libexec/java_home -v 17`

ZSH_THEME="robbyrussell"
HIST_STAMPS="dd.mm.yyyy"

plugins=(git yarn fnm zsh-autosuggestions zsh-syntax-highlighting)
source $ZSH/oh-my-zsh.sh

eval "$(starship init zsh)"
eval "$(fnm env --use-on-cd)"

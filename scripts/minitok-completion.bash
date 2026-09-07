# bash completion for minitok
_minitok() {
  local commands="run gui status doctor models activate checkout portal workspace evolution mcp"
  COMPREPLY=( $(compgen -W "$commands" -- "${COMP_WORDS[COMP_CWORD]}") )
}
complete -F _minitok minitok

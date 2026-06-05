# enable color support of ls and also add handy aliases
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
    #alias dir='dir --color=auto'
    #alias vdir='vdir --color=auto'

    alias grep='grep --color=auto'
    alias fgrep='fgrep --color=auto'
    alias egrep='egrep --color=auto'
fi

# some more ls aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'

# prevent nano from adding newlines
alias nano="nano --nonewlines"

# git convenience aliases
alias amend="git commit --amend --no-edit"
alias fpush="git push --force-with-lease"

# claude code aliases
alias cc="claude --worktree"

# PATH-prepend the ssh shim so Claude Code's startup github.com connectivity probe never reaches the
# forwarded FIDO/yubikey agent (which otherwise prompts a touch on every startup). See ~/.claude/bin/ssh
# + github.com/anthropics/claude-code/issues/21108. Applies to `cc` too.
# (The plugin-marketplace fetch is handled separately via CLAUDE_CODE_PLUGIN_PREFER_HTTPS in the
# devcontainer containerEnv, so it no longer uses ssh.)
alias claude='PATH="$HOME/.claude/bin:$PATH" command claude'

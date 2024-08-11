# dotfiles

## To Install

```
cd ~
git init
git remote add origin https://github.com/skleinjung/dotfiles.git
git fetch
git checkout -f master
```

## Common Tasks

### Register the SSH key for the current host

```
ssh-register
```

### Register all secret environment variables for the current host

> NOTE: the initial "." character!

```
. set-env-secrets
```

## Features

Bash Profile:

- Load environment variables from this repo
- Setup nvm, if installed
- Start one SSH agent per login (not terminal session)
- Register executable shadow path, ~/bin

Bash Aliases:

- `famend`
- `fpush`

Scripts:

- **bin/fetch-secret**: Fetches a single secret from LastPass and prints its value to stdout. Requires `lpass`.
- **bin/set-env-secrets**: Reads all secrets from a host's ".env" folder and exports them as environment variables. Requires `lpass`.
- **bin/ssh-register**: Adds SSH key direct from LastPass into current `ssh-agent`. Requires `jq` and `lpass`.

## To Add New Files

```
git add -f <FILE>
```

## Inspirations

- [Managing my dotfiles as a git repository (drewdevault.com)](https://drewdevault.com/2019/12/30/dotfiles.html)

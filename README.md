# dotfiles

## To Install

```
cd ~
git init
git remote add origin https://github.com/skleinjung/dotfiles.git
git fetch
git checkout -f master
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

- **bin/ssh-register**: adds SSH key direct from LastPass into current `ssh-agent`


## To Add New Files

```
git add -f <FILE>
```

## Inspirations

- [Managing my dotfiles as a git repository (drewdevault.com)](https://drewdevault.com/2019/12/30/dotfiles.html)

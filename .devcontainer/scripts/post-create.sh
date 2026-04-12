#!/usr/bin/env bash

set -euo pipefail

DOTFILES_REPO="https://github.com/techwithanirudh/dotfiles"
DOTFILES_DIR="$HOME/.dotfiles-techwithanirudh"

copy_env_example() {
  if [[ -f ".env" ]]; then
    echo ".env already exists; skipping copy"
  elif [[ -f ".env.example" ]]; then
    cp .env.example .env
  else
    echo "No .env.example found; skipping env file setup"
  fi
}

copy_path_if_present() {
  local src="$1"
  local dst="$2"

  if [[ -e "$src" ]]; then
    mkdir -p "$(dirname "$dst")"
    rsync -a "$src" "$dst"
  fi
}

install_host_auth_and_config() {
  echo "Syncing safe host config"

  copy_path_if_present /mnt/host-home/.gitconfig "$HOME/.gitconfig"
  copy_path_if_present /mnt/host-home/.gitconfig.local "$HOME/.gitconfig.local"
  copy_path_if_present /mnt/host-home/.npmrc "$HOME/.npmrc"
  copy_path_if_present /mnt/host-home/.bunfig.toml "$HOME/.bunfig.toml"
  copy_path_if_present /mnt/host-home/.config/gh/ "$HOME/.config/gh/"
  copy_path_if_present /mnt/host-home/.config/opencode/ "$HOME/.config/opencode/"
  copy_path_if_present /mnt/host-home/.config/git/ "$HOME/.config/git/"
}

ensure_dotfiles() {
  if [[ -d "$DOTFILES_DIR/.git" ]]; then
    echo "Updating dotfiles in $DOTFILES_DIR"
    git -C "$DOTFILES_DIR" pull --ff-only
  else
    echo "Cloning dotfiles into $DOTFILES_DIR"
    git clone "$DOTFILES_REPO" "$DOTFILES_DIR"
  fi
}

install_dotfiles() {
  echo "Installing dotfiles"
  bash "$DOTFILES_DIR/install.sh"
}

install_project_deps() {
  if [[ -f "pnpm-lock.yaml" ]]; then
    echo "Installing project dependencies with pnpm"
    corepack enable
    corepack prepare pnpm@8.15.7 --activate
    pnpm install
  elif [[ -f "bun.lock" || -f "bun.lockb" ]]; then
    echo "Installing project dependencies with bun"
    bun install
  elif [[ -f "package.json" ]]; then
    echo "Installing project dependencies with npm"
    npm install
  else
    echo "No project dependency manifest found; skipping install"
  fi
}

copy_env_example
install_host_auth_and_config
ensure_dotfiles
install_dotfiles
install_project_deps

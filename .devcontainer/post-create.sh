#!/bin/sh
# Installs the dependencies for Linux and prepares the database, the way the
# README's development steps do.
set -e

# Docker creates the node_modules volumes as root.
sudo chown bun:bun node_modules

mkdir -p "$DATA_DIR" "$BOOKS_DIR"
bun install --frozen-lockfile
bun run db:generate
bun run db:deploy

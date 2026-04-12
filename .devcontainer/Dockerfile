FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

ARG BUN_VERSION=1.2.9

RUN curl -fsSL https://bun.sh/install | bash -s -- bun-v${BUN_VERSION} \
    && mv /root/.bun/bin/bun /usr/local/bin/bun \
    && mv /root/.bun/bin/bunx /usr/local/bin/bunx \
    && rm -rf /root/.bun

ENV BUN_INSTALL=/usr/local

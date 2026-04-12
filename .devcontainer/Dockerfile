FROM debian:bookworm-slim

ENV LANG="C.UTF-8"
ARG DEBIAN_FRONTEND="noninteractive"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        jq \
        nano \
        unzip \
        vim-tiny \
        zip \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get autoremove -y \
    && apt-get clean -y

ENV SHELL=/bin/bash \
    DOCKER_BUILDKIT=1 \
    NODE_OPTIONS="--max-old-space-size=8192"

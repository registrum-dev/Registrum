# The development container: the same Bun as the production image, plus git and
# sudo so the `bun` user can take ownership of the node_modules volume, and
# Claude Code.
FROM oven/bun:1.4

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl git openssh-client procps sudo \
	&& rm -rf /var/lib/apt/lists/* \
	&& echo "bun ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/bun \
	&& chmod 0440 /etc/sudoers.d/bun

# Claude Code's native build, for the `bun` user. The config directory exists
# before its volume is mounted, so the volume starts out owned by `bun`.
USER bun
RUN curl -fsSL https://claude.ai/install.sh | bash \
	&& mkdir -p /home/bun/.claude
ENV PATH=/home/bun/.local/bin:$PATH

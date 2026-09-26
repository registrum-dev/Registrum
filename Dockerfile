# Registrum: the API server and the built web app in one image.
#
#   /data   the SQLite database and the cover thumbnails (read-write)
#   /books  the folders the shelves are made of (read-only is enough)

FROM oven/bun:1.4 AS build
WORKDIR /app

# Everything the install needs to run its postinstall (`varlock codegen` reads
# each package's .env.schema), then the rest of the source.
COPY . .
RUN bun install --frozen-lockfile

RUN cd packages/db && bunx prisma generate
RUN cd apps/web && bunx vite build

# Only what the server runs: its own source, the two packages it imports, and
# their production dependencies. The web app is its built files.
FROM oven/bun:1.4-slim AS runtime
WORKDIR /app

COPY --from=build /app/package.json /app/bun.lock /app/bunfig.toml /app/tsconfig.json ./
COPY --from=build /app/packages/config packages/config
COPY --from=build /app/packages/db packages/db
COPY --from=build /app/packages/api packages/api
COPY --from=build /app/apps/server apps/server
COPY --from=build /app/apps/web/dist apps/web/dist
# The base is glibc, so the musl binaries go, and so do the query compilers
# for every database but SQLite.
RUN rm -rf packages/*/node_modules apps/server/node_modules \
	&& bun install --production --ignore-scripts \
	&& rm -rf node_modules/.bun/*musl* /root/.bun/install/cache \
	&& find node_modules/.bun/@prisma+client@*/node_modules/@prisma/client/runtime \
		-name 'query_compiler_*' ! -name '*sqlite*' -delete

ENV NODE_ENV=production \
	PORT=3000 \
	DATA_DIR=/data \
	BOOKS_DIR=/books \
	DATABASE_URL=file:/data/registrum.db \
	WEB_DIST=/app/apps/web/dist

VOLUME ["/data", "/books"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
	CMD bun -e "fetch('http://localhost:' + (process.env.PORT ?? 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]

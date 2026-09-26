# Registrum

![Registrum — a self-hosted web reader for your book library](.github/social-preview.png)

A self-hosted multilingual web book reader. Reads EPUB, PDF, CBZ and ZIP, in horizontal, vertical and right-to-left text. Point it at your book folders, scan, and read from any browser — your reading position syncs across devices.

## Features

- **Libraries** — each folder under `/books` becomes a library; create as many as you like.
- **Scanning** — books are imported only when you press Scan. Metadata and covers are read from the files.
- **Reader** — powered by [foliate-js](https://github.com/johnfactotum/foliate-js): vertical/RTL text, ruby, two-page spreads, scrolling, adjustable font, margins and themes.
- **Progress sync** — saved on close, on tab switch, and every 60 seconds.
- **Search & filters** — width- and kana-insensitive search; filter by status, series, author, tags, rating, format and more.
- **Editing** — edit metadata per book or in bulk, merge authors and series, extract metadata from file paths with rules.
- **AI (optional)** — with any OpenAI-compatible endpoint, generate summaries, character lists and relationship maps, or ask questions about chapters (EPUB only).
- **Password (optional)** — require sign-in per browser.

## Quick start (Docker)

Images for `linux/amd64` and `linux/arm64` are published to the GitHub Container Registry on every change to `main`. No clone needed — save this as `compose.yaml` in an empty folder:

```yaml
# compose.yaml
services:
  registrum:
    image: ghcr.io/registrum-dev/registrum:latest
    ports:
      - "3000:3000"
    environment:
      REGISTRUM_PASSWORD: ${REGISTRUM_PASSWORD:-}
    volumes:
      - ./data:/data          # database and covers
      - ./books:/books:ro     # your books
    restart: unless-stopped
```

```sh
mkdir -p data books
docker compose up -d
```

Open `http://localhost:3000`, pick a folder under `/books` to create a library, then press **Scan**.

Book files are never modified, so `/books` can be mounted read-only. Database migrations run automatically on startup.

### Updating

```sh
docker compose pull
docker compose up -d
```

`latest` follows `main`. To stay on one build, use a `sha-<commit>` tag instead (e.g. `ghcr.io/registrum-dev/registrum:sha-4cef92c`); the available tags are listed on the [package page](https://github.com/registrum-dev/Registrum/pkgs/container/registrum).

### Building from source

The `compose.yaml` in this repository can also build the image itself:

```sh
git clone https://github.com/registrum-dev/Registrum.git
cd Registrum
mkdir -p data books
docker compose up -d --build
```

### Environment variables

| Name | Default | Description |
| --- | --- | --- |
| `REGISTRUM_PASSWORD` | (empty) | Sign-in password. Empty disables sign-in |
| `PORT` | `3000` | Listening port |
| `DATA_DIR` | `/data` | Database and covers |
| `BOOKS_DIR` | `/books` | Parent folder for libraries |
| `DATABASE_URL` | `file:/data/registrum.db` | SQLite file |
| `CORS_ORIGIN` | (empty) | Only needed when serving the web UI from another origin |

Registrum does not terminate TLS. For access outside your home network, put it behind a reverse proxy such as Caddy or Traefik.

## Notes

- AI API keys are stored unencrypted in the database — protect `/data`. Summaries send the full book text to the endpoint (tens of thousands of tokens or more).
- Manually edited metadata is never overwritten by rescans. Moved files keep their history if the name and size match.
- Comics and scanned PDFs have no text, so they can't be searched.
- Kanji titles sort by code point, not by reading.

## Development

Requires [Bun](https://bun.sh) 1.4+.

```sh
bun install
mkdir -p data books
bun run db:generate
bun run db:deploy
bun run dev              # API on :3000, web on :3001
```

Other scripts: `bun run check-types`, `bun run check` (Biome), `bun run db:migrate`, `bun run db:studio`.

Stack: Hono + tRPC server (`apps/server`), React web app (`apps/web`), shared API logic (`packages/api`), Prisma + SQLite (`packages/db`).

## License

[MIT](LICENSE). Bundled foliate-js (MIT) includes zip.js (BSD-3-Clause) and pdf.js (Apache-2.0); see `apps/web/public/foliate-js/LICENSE`.

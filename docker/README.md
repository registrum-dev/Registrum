# Docker Compose

Two ways to run Registrum. Pick one; they share `./data`, so don't run both at once.

| File | Reached at | Use it when |
| --- | --- | --- |
| `compose.yaml` | `http://<host>:3000` | On your own machine or a home network you trust |
| `compose.tailscale.yaml` | `https://<TS_HOSTNAME>.<your-tailnet>.ts.net` | From your other devices, anywhere, over HTTPS |

Run every command from this folder. The `.env`, `data/` and `books/` live here too.

## Setup

```sh
mkdir -p data books
cp .env.example .env
```

Put your books under `books/`; each sub-folder can become a shelf. Registrum never writes to it.

Fill in `.env` as needed. For `compose.yaml` every value is optional; `compose.tailscale.yaml` also needs `TS_AUTHKEY`. See the [main README](../README.md#environment-variables) for what each variable does.

## HTTP

```sh
docker compose up -d
```

Open `http://localhost:3000`, pick a folder under `/books` to create a shelf, then press **Scan**.

## Tailscale (HTTPS)

A Tailscale container joins your tailnet and Tailscale Serve fetches a certificate for its MagicDNS name, then forwards port 443 to Registrum. No port is opened on the host.

1. Turn on **HTTPS Certificates** in the [DNS settings](https://login.tailscale.com/admin/dns).
2. Create an [auth key](https://login.tailscale.com/admin/settings/keys).
3. Set `TS_AUTHKEY` in `.env`. Change `TS_HOSTNAME` too if you want a node name other than `registrum`.

4. Start it:

   ```sh
   docker compose -f compose.tailscale.yaml up -d
   ```

Open `https://registrum.<your-tailnet>.ts.net`. The first visit can take a few seconds while the certificate is issued.

The node's identity is kept in the `tailscale-state` volume, so the auth key is only used the first time and may expire afterwards. To join again from scratch, remove the volume with `docker compose -f compose.tailscale.yaml down -v`; `./data` is not affected.

The proxy is set up in `tailscale/serve.json`. `${TS_CERT_DOMAIN}` in it is filled in by the Tailscale container at startup.

## Switching between the two

Stop one before starting the other:

```sh
docker compose down
docker compose -f compose.tailscale.yaml up -d
```

## Updating

```sh
docker compose pull
docker compose up -d
```

Add `-f compose.tailscale.yaml` to both for the Tailscale setup. Database migrations run on startup.

## Building from source

Both files build the image from the repository root when asked:

```sh
docker compose up -d --build
```

## Files

| File | Role |
| --- | --- |
| `compose.yaml` | Registrum on port 3000 |
| `compose.tailscale.yaml` | Registrum behind Tailscale Serve |
| `tailscale/serve.json` | Serve's HTTPS-to-Registrum proxy |
| `.env.example` | Template for `.env` |
| `.env` | Your settings (not committed) |
| `data/` | Database and covers (not committed) |
| `books/` | Your books (not committed) |

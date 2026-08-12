# Feromeet Web

Adaptive Expo / React Native Web client for the existing Feromeet service.
It shares one component tree across desktop web, mobile web, Android, and iOS.

## Features

- Phone/SMS authentication against the Feromeet API
- Responsive discovery cards and profile details
- Likes, favourites, search preferences, and budget-based invitations
- Active and past date timelines
- Chat history plus SockJS/STOMP realtime transport
- Profile, safety, logout, and account deletion flows
- Safe demo data when no test account is available

The observed endpoint contract is documented in
[`docs/api-contract.md`](docs/api-contract.md). No credentials, tokens,
decompiled sources, or private user data are stored in this repository.

## Development

Requirements: Node 22.

```bash
npm install
cp .env.example .env
npm run web
```

The production API rejects browser CORS preflights. Set
`EXPO_PUBLIC_API_URL` to the deployed allowlisted proxy URL. Native builds can
use `https://feromeet.com` directly.

## Checks

```bash
npm run typecheck
npm test
npm run export
```

## Deployment

The static Expo export is deployed to GitHub Pages by
`.github/workflows/deploy-pages.yml`.

The proxy is intentionally a separate small deployment:

```bash
cd proxy
npm install
vercel
```

Set `ALLOWED_ORIGINS` on the proxy to the final Pages URL. Then set the
repository variable `EXPO_PUBLIC_API_URL` to
`https://<proxy-host>/api/proxy`.

The proxy:

- forwards only a fixed allowlist of Feromeet endpoints;
- never accepts an arbitrary upstream URL;
- forwards only required headers;
- does not log request bodies or tokens;
- applies body-size and rate limits.

## Scope

Browser push notifications and app-store payments are not fabricated. The
analysed Android build exposes FCM notifications but no Retrofit payment
interface. Realtime chat can fall back to history refresh if the upstream
WebSocket rejects browser origins.

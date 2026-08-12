# Feromeet API contract

Sanitised clean-room notes from the publicly distributed Android client.

## Source

- Google Play package: `com.feromeet.app`
- Publisher: `INERA, OOO`
- Analysed package: `1.1.4` (`versionCode` 30), Android API 26–36
- XAPK SHA-256: `feadd9c6e1caa26eb4b8b7f9c44e727e95a0a60d39c295aa6808d9fc0bb82f63`
- API host: `https://feromeet.com`
- Photo host: `https://storage.yandexcloud.net/feromeet-bucket/photos/`
- Chat transport: SockJS/STOMP at `https://feromeet.com/ws-chat`

No application secrets, tokens, signing material, or user data are included here.

## Transport

- JSON requests use `Content-Type: application/json`.
- Authenticated HTTP requests use `Authorization: Bearer <accessToken>`.
- A refresh token is exchanged for a new token pair.
- Browser preflight from the GitHub Pages origin currently returns `403` without
  CORS headers. Web builds therefore use the allowlisted same-origin proxy.

## Authentication

| Method | Path | Body / result |
| --- | --- | --- |
| POST | `/api/auth/login/request-sms` | `{ phoneNumber }` |
| POST | `/api/auth/login/login-with-sms` | `{ phoneNumber, smsCode }` → token pair |
| POST | `/api/auth/registration/request-sms` | `{ phoneNumber }` |
| POST | `/api/auth/registration/register-with-sms` | `{ phoneNumber, smsCode }` → token pair |
| POST | `/api/auth/refresh-access-token` | `{ refreshToken }` → token pair |

Token result fields are `accessToken`, `refreshToken`, and
`registrationStatus`. Observed status values:

- `NONE`
- `NOT_REGISTERED_PHONE_ENTERED`
- `REGISTERED_PHONE_VERIFIED` — continue onboarding
- `REGISTERED_PROFILE_FILLED` / `REGISTERED` — enter the main app
- `PROFILE_REQUIRED` — legacy alias treated as onboarding

## Discovery and reactions

| Method | Path | Body / query |
| --- | --- | --- |
| GET | `/api/user/get-all-users` | — |
| GET | `/api/user/get-by-id` | `userId` |
| GET | `/api/user/get-search-preference` | — |
| POST | `/api/user/save/search-preference` | `{ sex, ageMin, ageMax, radius }` |
| POST | `/api/meet/invite` | `{ price: 0, ferotag, expenseType, comment, userTo }` |
| GET | `/api/reaction/get-all-reactions` | — |
| POST | `/api/reaction/add-like` | user id body |
| POST | `/api/reaction/add-dislike` | user id body |
| POST | `/api/reaction/add-favorite` | user id body |
| POST | `/api/reaction/remove-favorite` | user id body |

Discovery users include `id`, `name`, `city`, `birthday`, `gender`, `rating`,
`interestedIn`, `readyToGo`, `height`, `lastSeen`, `ferotags`,
`infotagCategories`, photo filenames, `textAbout`, `isFavorite`, and
`impressionTags`. Invite `expenseType` is `I_PAY | SPLIT | YOU_PAY`. The
native client sends `price: 0` (no budget field). `GET /api/reaction/get-all-reactions`
returns `{ user, isFavorite, isLikeYou }[]`.

## Profile

Base path: `/api/user/`.

| Method | Path | Body |
| --- | --- | --- |
| GET | `get-my-user` | — |
| DELETE | `delete` | — |
| POST | `save/height` | `{ height }` |
| POST | `save/text-about` | `{ textAbout }` |
| POST | `save/ferotags` | selected tags |
| POST | `save/infotags` | `{ infotagCategory, infotags }` |
| POST | `save/geo` | `{ lat, lng, city }` as strings |
| POST multipart | `save/photos` | main, preview and additional photos |
| POST | `save/device` | FCM device token (native only) |

Initial onboarding posts a multipart profile to
`/api/auth/registration/save-profile`.

## Meets

Base path: `/api/meet/`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `get-active-meets` | Active invitations and dates |
| GET | `get-passed-meets` | Past dates |
| GET | `get-by-id?meetId=…` | Date details |
| GET | `get-impression-tags?sex=…&role=…` | Rating tags |
| POST | `stage1/accept-by-victim` | Accept invitation |
| POST | `stage2/consent-from-hunter` | Confirm details |
| POST | `stage2/consent-from-victim` | Confirm details |
| POST | `stage3/arrival-from-hunter` | Confirm arrival |
| POST | `stage3/arrival-from-victim` | Confirm arrival |
| POST | `cancel` | Cancel a date |
| POST | `rate` | `{ meetId, score, comment, impressionTags }` |
| POST | `mark-as-read` | Clear meet updates |
| POST | `hide` | Hide a past meet |

Meet records include `meetId`, `chatId`, `price`, `ferotag`, `expenseType`,
`status`, role flags, rating/cancellation/update flags, unread count,
`createdAt`, stage timeline, `lastSeen`, and the other user.

## Chat

- History: `GET /api/meet/api/chat/get-history?chatId=…`
- Socket: SockJS/STOMP `https://feromeet.com/ws-chat`
- Browser builds cannot upgrade WebSocket through the HTTP proxy. Set
  `EXPO_PUBLIC_WS_URL` for native/direct access; otherwise the web client
  shows chat history only.
- Auth is sent both in the WebSocket handshake and STOMP `CONNECT`.
- Subscriptions:
  - `/user/queue/chat.{chatId}.messages`
  - `/user/queue/chat.{chatId}.message-status`
  - `/user/queue/chat.{chatId}.typing-status`
- Message fields: `id`, `senderId`, `recipientId`, `content`, `chatId`,
  `createdAt`, `status`.

The exact STOMP send destinations remain runtime-confirmation items. The web
client exposes chat history immediately and enables realtime only after a
successful socket negotiation.

# Orbit — All-in-One Social Platform Starter

Orbit is an original-branded, mobile-responsive social platform foundation that brings common social-networking and live-media workflows into **one independent repository**. It is inspired by broad feature categories found across social networks, messaging tools, creator platforms, communities, and live services. It does not copy their logos, names, source code, or proprietary UI.

## Included in this repository

- Responsive home feed and post composer
- Account registration/sign-in/sign-out with hashed passwords and HTTP-only session cookie
- Post likes and comments
- Communities: create, browse, join, and leave
- One-to-one text messaging by username
- Live-room records with video/audio/screen-share room types and host end-room action
- Profile view, feed search, discover page, watch placeholder, mobile navigation
- JSON persistence for local development, API health endpoint, and Node test suite
- Clear integration notes for real media streaming and video delivery

## Important status: what works vs. what still needs engineering

This is a **runnable starter**, not a claim that every capability in dozens of commercial platforms is already implemented. Posts, accounts, comments, likes, communities, text messages, and live-room records are implemented in the included application. Live rooms currently create room records only: there is no real-time audio/video transport, screen capture, guest stage, recording, or viewer playback until a provider such as LiveKit or Daily is integrated. Video upload/transcoding/CDN delivery, push notifications, end-to-end encrypted messaging, voice/video calling, stories, reels, recommendations, moderation/admin tooling, OAuth providers, production database, payments, and app-store packaging are not yet implemented. No fake wallet, payment balance, gift purchase, or payout flow is included.

The included JSON file store is suitable only for local development and small single-process evaluation. It is not a production database and has no multi-process locking. Before public deployment, replace it with PostgreSQL (or a managed equivalent), add migrations, rate limiting, email verification and password reset, CSRF/origin protections appropriate to the deployment, account recovery, abuse reporting, moderation, audit logging, backups, privacy controls, and security review. Set a strong `SESSION_SECRET`, serve only over HTTPS, and configure secure cookies. Do not expose this development build to the public internet as-is.

## Requirements

- Node.js 20 or newer
- No third-party npm packages are required for this starter

## Run on a laptop

1. Extract the ZIP.
2. Open a terminal in the `orbit-social-platform` folder.
3. Run `npm start`.
4. Open `http://localhost:4173` in your browser.

For development auto-restarts, use `npm run dev`.

## Open on your phone on the same Wi-Fi

1. Start the server on your laptop with `npm start`.
2. Find your laptop's local IPv4 address (for example, `192.168.1.25`).
3. On your phone connected to the same Wi-Fi, open `http://192.168.1.25:4173` using your laptop's actual address.
4. Allow Node through your laptop firewall for private/local networks if prompted.

This local-network method is for testing only; do not port-forward the development server to the public internet.

## Tests

Run `npm test`. Tests start a temporary local server with an isolated temporary data directory and exercise health, registration, authorization, post creation, likes, and community creation. A test pass does not mean the unfinished integrations listed above are complete.

## Configuration

Copy `.env.example` to `.env` if you use a dotenv loader later; the current no-dependency server reads environment variables directly and does not automatically load `.env`. Example:

```sh
PORT=4173 SESSION_SECRET="replace-with-a-long-random-secret" npm start
```

Local data is stored under `.data/store.json` by default and is excluded from Git. Do not commit secrets or real user data.

## API outline

- `GET /api/health`
- `GET /api/me`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/feed`, `POST /api/posts`
- `POST /api/posts/:id/like`, `POST /api/posts/:id/comments`
- `GET /api/communities`, `POST /api/communities`, `POST /api/communities/:id/join`
- `GET /api/messages`, `POST /api/messages`
- `GET /api/live/rooms`, `POST /api/live/rooms`, `POST /api/live/rooms/:id/end`

## Suggested next build milestones

1. Replace JSON persistence with PostgreSQL and versioned migrations.
2. Add authentication hardening, email verification, account recovery, roles, privacy settings, and moderation.
3. Integrate LiveKit/Daily for real video, audio-only, and screen-share sessions, including participant permissions and reconnect handling.
4. Add object storage plus a video pipeline/CDN for creator uploads and playback.
5. Add realtime messaging, delivery/read state, attachments, calls, notifications, and optional encryption design.
6. Add stories/short video, creator pages, follows, discovery ranking, search indexing, reporting, analytics, and admin controls.
7. Add deployment infrastructure, observability, load/security testing, backup/restore drills, and mobile app packaging.

## License

No license is granted for third-party brands or assets. Add a project license before accepting contributions or distributing beyond evaluation.

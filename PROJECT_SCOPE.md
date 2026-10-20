# Orbit project scope and feature map

## Product direction
One original platform, one repository, modular feature areas. The listed commercial services are references for broad user needs only, not a checklist of finished parity or permission to copy proprietary design/branding.

## Feature domains
- Social graph: profiles, posts, comments, reactions, follow/friend relationships, privacy and blocks.
- Messaging: one-to-one/group chat, media attachments, delivery state, calls, notification preferences.
- Communities: discovery, membership, posts, roles, events and moderation.
- Creator media: uploads, watch pages, short-form clips, playlists, creator profiles and analytics.
- Live: video, audio-only, screen share, guests, host/moderator controls, chat, reporting and playback.
- Work/meetings: scheduled rooms, invite links, participant permissions, screen share and meeting controls.
- Safety: reports, moderation queues, rate limits, age/privacy controls, abuse prevention and audit trails.
- Operations: production database, migrations, object storage, monitoring, backups, deployment and release checks.

## Current repository implementation
The current build contains working local account, post, like, comment, community, text-message, and live-room-record flows. Many domains above are future milestones. The UI intentionally labels real-time media and video delivery as integration work rather than pretending they are active.

## Repository layout

```text
orbit-social-platform/
├── public/
│   ├── index.html       # Responsive app shell
│   ├── styles.css       # Responsive styling
│   └── app.js           # Frontend navigation and API interactions
├── src/
│   └── server.js        # Node HTTP server, API, local JSON persistence
├── tests/
│   └── server.test.js   # API integration smoke tests
├── .env.example
├── .gitignore
├── package.json
├── PROJECT_SCOPE.md
└── README.md
```

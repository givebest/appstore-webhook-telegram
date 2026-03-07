# App Store Webhook

Receives App Store Server Notifications v2, verifies JWS signatures, and sends Telegram notifications.

## Setup

```bash
cp .env.example .env.local
# Fill in the values
```

| Variable             | Description                          |
| -------------------- | ------------------------------------ |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token (via @BotFather)  |
| `TELEGRAM_CHAT_ID`   | Chat ID to receive notifications     |

## Local Development

```bash
pnpm local
# Listening on http://localhost:3003
```

Expose local port with ngrok:

```bash
ngrok http 3003
```

Paste the ngrok URL into App Store Connect → App Information → App Store Server Notifications → Sandbox Server URL, then click **Send Test Notification**.

## Deploy

```bash
vercel deploy
```

Set environment variables in the Vercel Dashboard, then paste the production URL into App Store Connect Production Server URL.

## Webhook Endpoint

```
POST /api/apple/app_name
```

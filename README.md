# App Store Webhook

接收 App Store Server Notifications v2，验证 JWS 签名，推送 Telegram 通知。

## 配置

```bash
cp .env.example .env.local
# 编辑 .env.local 填入真实值
```

| 变量 | 说明 |
|------|------|
| `APPLE_BUNDLE_ID` | App 的 Bundle ID |
| `APPLE_APP_APPLE_ID` | App Store Connect 数字 App ID（Production 必填） |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token（via @BotFather） |
| `TELEGRAM_CHAT_ID` | 接收通知的 Chat ID |

## 本地开发

```bash
pnpm local
# 监听 http://localhost:3003
```

用 ngrok 暴露本地端口：

```bash
ngrok http 3003
```

将 ngrok URL 填入 App Store Connect → App Information → App Store Server Notifications → Sandbox Server URL，点击 **Send Test Notification**。

## 部署

```bash
vercel deploy
```

在 Vercel Dashboard 配置环境变量，然后将生产 URL 填入 App Store Connect Production Server URL。

## Webhook 端点

```
POST /api/apple
```

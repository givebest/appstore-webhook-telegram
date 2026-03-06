const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

// Maps notificationType to [emoji, label]
const TYPE_INFO: Record<string, [string, string]> = {
  SUBSCRIBED:                ["💰", "新订阅"],
  DID_RENEW:                 ["🔄", "续订成功"],
  DID_FAIL_TO_RENEW:         ["⚠️", "续订失败"],
  DID_CHANGE_RENEWAL_STATUS: ["🔔", "续订状态变更"],
  DID_CHANGE_RENEWAL_PREF:   ["🔀", "续订计划变更"],
  EXPIRED:                   ["💤", "订阅到期"],
  REFUND:                    ["↩️", "退款"],
  REFUND_DECLINED:           ["🚫", "退款被拒"],
  CONSUMPTION_REQUEST:       ["❓", "消耗品退款请求"],
  PRICE_INCREASE:            ["📈", "价格上涨"],
  REVOKE:                    ["👨‍👩‍👧", "家庭共享撤销"],
  ONE_TIME_CHARGE:           ["🛒", "一次性购买"],
  RENEWAL_EXTENSION:         ["📅", "续订延期"],
  RENEWAL_EXTENDED:          ["✅", "续订已延期"],
  TEST:                      ["🧪", "测试通知"],
};

const SUBTYPE_LABELS: Record<string, string> = {
  INITIAL_BUY:        "首次购买",
  RESUBSCRIBE:        "重新订阅",
  BILLING_RECOVERY:   "账单恢复",
  GRACE_PERIOD:       "宽限期",
  AUTO_RENEW_ENABLED: "已开启自动续订",
  AUTO_RENEW_DISABLED:"已关闭自动续订",
  UPGRADE:            "升级",
  DOWNGRADE:          "降级",
  VOLUNTARY:          "主动取消",
  BILLING_RETRY:      "账单重试失败",
  PRICE_INCREASE:     "价格上涨未同意",
  SUMMARY:            "汇总",
  FAILURE:            "失败",
};

export interface NotificationData {
  notificationType: string;
  subtype?: string | null;
  productId?: string | null;
  priceMills?: number | null;
  currency?: string | null;
  environment: string;
  transactionId?: string | null;
}

function formatPrice(priceMills: number | null | undefined, currency: string | null | undefined): string {
  if (priceMills == null || !currency) return "未知";
  const amount = (priceMills / 1000).toFixed(2);
  return `${amount} ${currency}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export async function sendTelegramNotification(data: NotificationData): Promise<void> {
  const [emoji, typeLabel] = TYPE_INFO[data.notificationType] ?? ["📩", data.notificationType];
  const subtypeLabel = data.subtype ? (SUBTYPE_LABELS[data.subtype] ?? data.subtype) : null;
  const typeDisplay = subtypeLabel ? `${typeLabel} · ${subtypeLabel}` : typeLabel;
  const envBadge = data.environment === "Sandbox" ? " `[Sandbox]`" : "";

  const lines = [
    `${emoji} *${typeDisplay}*${envBadge}`,
    ``,
    `产品  \`${data.productId ?? "—"}\``,
    `金额  ${formatPrice(data.priceMills, data.currency)}`,
    `时间  ${formatDate(Date.now())}`,
  ];

  if (data.transactionId) {
    lines.push(`交易  \`${data.transactionId}\``);
  }

  const text = lines.join("\n");

  const res = await fetch(TELEGRAM_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[telegram] failed to send message:", body);
  }
}

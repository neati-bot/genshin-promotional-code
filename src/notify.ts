import {
  DISCORD_WEBHOOK_ENV,
  HTTP_TIMEOUT_MS,
  REDEEM_BASE_URL,
  USER_AGENT,
} from '../config.js';
import type { CodeEntry, Reward } from './parse.js';

/**
 * Discord notifier. Three message kinds:
 *
 *   1. Code alert  — new redeemable code surfaced from the wiki.
 *   2. Startup     — once-per-cold-start "server on" healthcheck so
 *                    the operator can confirm cron is firing.
 *   3. Failure     — one-shot alert after FAILURE_THRESHOLD consecutive
 *                    fetch/parse failures.
 *
 * The webhook URL itself is read from an env var and is *never*
 * included in thrown errors or logs — leaking it would let anyone
 * spam the channel.
 */

const PRIMOGEM_GOLD = 0xffd700;
const HEALTHCHECK_GREEN = 0x57f287;
const FAILURE_RED = 0xed4245;

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

export async function sendCodeAlert(code: CodeEntry): Promise<void> {
  const redeemUrl = `${REDEEM_BASE_URL}?code=${encodeURIComponent(code.code)}`;
  const embed: DiscordEmbed = {
    title: `🎁 새 원신 코드: ${code.code}`,
    description: `[코드 입력하기 →](${redeemUrl})`,
    color: PRIMOGEM_GOLD,
    fields: [
      { name: '보상', value: formatRewards(code.rewards), inline: false },
      { name: '만료', value: formatExpiry(code.expires), inline: true },
      { name: '발견', value: code.discovered, inline: true },
      { name: '서버', value: code.server, inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
  await postEmbed(embed);
}

export async function sendStartupMessage(activeCount: number): Promise<void> {
  const embed: DiscordEmbed = {
    title: '✅ Genshin Code Notifier — Server on',
    description: `현재 활성 코드 **${activeCount}개**를 시드 완료했습니다. 다음 cron부터 새 코드만 알림드릴게요.`,
    color: HEALTHCHECK_GREEN,
    timestamp: new Date().toISOString(),
  };
  await postEmbed(embed);
}

export async function sendFailureAlert(count: number, error: Error): Promise<void> {
  const embed: DiscordEmbed = {
    title: '⚠️ Genshin Code Notifier — 연속 실패',
    description: `${count}회 연속 실패했습니다. fandom 위키 또는 워크플로우 점검이 필요할 수 있습니다.`,
    color: FAILURE_RED,
    fields: [
      {
        name: '에러',
        value: '```\n' + truncate(error.message, 900) + '\n```',
      },
    ],
    timestamp: new Date().toISOString(),
  };
  await postEmbed(embed);
}

function formatRewards(rewards: readonly Reward[]): string {
  if (rewards.length === 0) return '(보상 정보 없음)';
  return rewards.map((r) => `${r.qty} × ${r.item}`).join(', ');
}

function formatExpiry(expires: string): string {
  if (expires === 'indef') return '기한 없음';
  if (expires === 'unknown') return '미정';
  return expires;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

async function postEmbed(embed: DiscordEmbed): Promise<void> {
  const webhookUrl = process.env[DISCORD_WEBHOOK_ENV];
  if (!webhookUrl || webhookUrl.length === 0) {
    throw new NotifyError(`${DISCORD_WEBHOOK_ENV} env var is not set`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({ embeds: [embed] }),
      signal: controller.signal,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new NotifyError(`Discord webhook POST failed: ${redact(reason)}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new NotifyError(
      `Discord webhook returned HTTP ${response.status}: ${redact(body).slice(0, 200)}`
    );
  }
}

/**
 * Strip any Discord webhook URL fragments from a string before logging.
 * fetch errors sometimes echo the request URL in their message; the
 * webhook token must never reach Actions logs (public on public repos).
 */
function redact(text: string): string {
  return text.replace(
    /https:\/\/(?:[a-z]+\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/gi,
    '<redacted-webhook>'
  );
}

export class NotifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotifyError';
  }
}

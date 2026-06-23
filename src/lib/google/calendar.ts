import { JWT } from 'google-auth-library';
import { env } from '@/lib/env';
import type {
  GoogleCalendarEvent,
  GoogleCalendarEventDateTime,
  GoogleCalendarEventsListResponse,
} from './types';

/**
 * Google Calendar API クライアント（読み書き）。
 *
 * 店舗の単一 Google カレンダーをサービスアカウントに「予定の変更権限」付きで共有し、
 * そのサービスアカウントの認証情報で events を読み取り／作成／削除する。
 * `getSupabaseAdmin()`（src/lib/supabase/admin.ts）と同形の遅延初期化シングルトン。
 */

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
// calendar.events は events の読み取り＋作成/更新/削除を許可（list もこのスコープで可）
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

let jwtClient: JWT | null = null;

function getGoogleCalendarClient(): JWT {
  if (!jwtClient) {
    const email = env.GOOGLE_CALENDAR_CLIENT_EMAIL;
    const key = env.GOOGLE_CALENDAR_PRIVATE_KEY;

    if (!email || !key) {
      throw new Error('Missing Google Calendar service account credentials');
    }

    jwtClient = new JWT({
      email,
      key,
      scopes: SCOPES,
    });
  }

  return jwtClient;
}

/**
 * 指定期間のイベントを取得する。
 *
 * @param timeMin RFC3339（例: 2026-06-01T00:00:00+09:00）。下限（含む）
 * @param timeMax RFC3339。上限（含まない）
 * @returns 期間内のイベント配列（繰り返しは単発展開済み）
 * @throws 認証情報・カレンダー ID 未設定、または API エラー時
 */
export async function listCalendarEvents(
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const calendarId = env.GOOGLE_CALENDAR_ID;
  if (!calendarId) {
    throw new Error('Missing GOOGLE_CALENDAR_ID');
  }

  const client = getGoogleCalendarClient();
  const eventsUrl = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;

  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      timeZone: env.GOOGLE_CALENDAR_TIMEZONE,
      maxResults: '2500',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const { data } = await client.request<GoogleCalendarEventsListResponse>({
      url: `${eventsUrl}?${params.toString()}`,
      method: 'GET',
    });

    if (data.items) events.push(...data.items);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return events;
}

/** 予定作成/更新の入力（Google Calendar events リソースの最小フィールド） */
export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: GoogleCalendarEventDateTime;
  end: GoogleCalendarEventDateTime;
}

/**
 * 予定を作成する（events.insert）。
 * @throws 認証情報・カレンダー ID 未設定、書き込み権限なし、または API エラー時
 */
export async function createCalendarEvent(input: CalendarEventInput): Promise<GoogleCalendarEvent> {
  const calendarId = env.GOOGLE_CALENDAR_ID;
  if (!calendarId) {
    throw new Error('Missing GOOGLE_CALENDAR_ID');
  }
  const client = getGoogleCalendarClient();
  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
  const { data } = await client.request<GoogleCalendarEvent>({
    url,
    method: 'POST',
    data: input,
  });
  return data;
}

/**
 * 予定を削除する（events.delete）。
 * @throws 認証情報・カレンダー ID 未設定、書き込み権限なし、または API エラー時
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendarId = env.GOOGLE_CALENDAR_ID;
  if (!calendarId) {
    throw new Error('Missing GOOGLE_CALENDAR_ID');
  }
  const client = getGoogleCalendarClient();
  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  await client.request({
    url,
    method: 'DELETE',
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { adminCalendarEventSchema, formatValidationErrors } from '@/lib/validation/schemas';
import {
  listCalendarEvents,
  createCalendarEvent,
  type CalendarEventInput,
} from '@/lib/google/calendar';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { env } from '@/lib/env';
import { writeAuditLog } from '@/lib/logging/audit-log';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 対象月の Asia/Tokyo 境界（DST 無しのため固定 +09:00）を RFC3339 で返す */
function monthBounds(month: string): { timeMin: string; timeMax: string } {
  const [year, monthNum] = month.split('-').map(Number);
  const nextYear = monthNum === 12 ? year + 1 : year;
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
  return {
    timeMin: `${month}-01T00:00:00+09:00`,
    timeMax: `${nextYear}-${pad2(nextMonth)}-01T00:00:00+09:00`,
  };
}

/** type → Google 予定タイトル（mapper がキーワードで種別を判定する） */
const TYPE_SUMMARY: Record<string, string> = {
  day: '昼の部',
  night: '夜の部',
  stage: 'もも娘ステージ',
  closed: '休園',
};

/** 'YYYY-MM-DD' の翌日（終日イベントの end.date は排他的なため） */
function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** GET: 当月の予定一覧（管理用。削除に使う id を含む生イベント） */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month パラメータが必要です (YYYY-MM)' }, { status: 400 });
  }

  try {
    const { timeMin, timeMax } = monthBounds(month);
    const events = await listCalendarEvents(timeMin, timeMax);
    const items = events.map((e) => ({
      id: e.id,
      summary: e.summary ?? '',
      description: e.description ?? '',
      start: e.start,
      end: e.end,
    }));
    return NextResponse.json({ month, events: items });
  } catch (error) {
    secureLog('error', 'Admin calendar events fetch failed', safeErrorLog(error));
    return NextResponse.json({ error: 'calendar_fetch_failed' }, { status: 502 });
  }
}

/** POST: 予定を Google カレンダーへ作成 */
export async function POST(request: NextRequest) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = adminCalendarEventSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
      { status: 400 }
    );
  }

  const { date, type, startTime, endTime, note } = parseResult.data;
  const tz = env.GOOGLE_CALENDAR_TIMEZONE;

  // 休園、または時刻未指定は終日イベント。それ以外は時刻付き。
  const isAllDay = type === 'closed' || !startTime || !endTime;
  const input: CalendarEventInput = {
    summary: TYPE_SUMMARY[type],
    description: note || undefined,
    start: isAllDay ? { date } : { dateTime: `${date}T${startTime}:00`, timeZone: tz },
    end: isAllDay ? { date: nextDay(date) } : { dateTime: `${date}T${endTime}:00`, timeZone: tz },
  };

  try {
    const created = await createCalendarEvent(input);
    // 公開カレンダーのキャッシュ（tag: iitate-calendar）を無効化して即時反映
    revalidateTag('iitate-calendar');

    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'calendar.event_create',
      targetType: 'calendar',
      targetId: created.id ?? date,
      metadata: { date, type },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (error) {
    secureLog('error', 'Admin calendar event create failed', safeErrorLog(error));
    return NextResponse.json({ error: 'calendar_create_failed' }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { listCalendarEvents } from '@/lib/google/calendar';
import {
  mapGoogleEventsToMonth,
  type MappedCalendarEvent,
} from '@/lib/google/iitate-calendar-mapper';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { env } from '@/lib/env';

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

/**
 * Google カレンダーから当月イベントを取得しマッピングする。
 * 月単位でキャッシュ（1 時間鮮度）し、Google API クォータを保護する。
 * month は引数として渡すことで unstable_cache のキーに含める。
 */
const fetchEventsCached = unstable_cache(
  async (month: string): Promise<MappedCalendarEvent[]> => {
    const { timeMin, timeMax } = monthBounds(month);
    const events = await listCalendarEvents(timeMin, timeMax);
    return mapGoogleEventsToMonth(events, month, env.GOOGLE_CALENDAR_TIMEZONE);
  },
  ['iitate-calendar-events'],
  { tags: ['iitate-calendar'], revalidate: 3600 }
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month パラメータが必要です (YYYY-MM)' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // events は Google（正）、notes は Supabase（継続）。互いに独立して取得し、
  // 片方が失敗してももう片方は返せるようにする。
  // events 取得が失敗した場合は degraded=true を立て、クライアントが
  // 「0件」ではなく「読み込み失敗」として扱えるようにする。
  let eventsDegraded = false;
  const [events, notes] = await Promise.all([
    fetchEventsCached(month).catch((error) => {
      secureLog('error', 'Failed to fetch Google Calendar events', safeErrorLog(error));
      eventsDegraded = true;
      return [] as MappedCalendarEvent[];
    }),
    supabase
      .from('iitate_calendar_month_notes')
      .select('notes')
      .eq('year_month', month)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          secureLog('error', 'Failed to fetch month notes', safeErrorLog(error));
          return [] as string[];
        }
        return (data?.notes as string[] | undefined) ?? [];
      }),
  ]);

  // 既存の正常レスポンス形（month/events/notes）は維持し、degraded は失敗時のみ付与する。
  return NextResponse.json({ month, events, notes, ...(eventsDegraded ? { degraded: true } : {}) });
}

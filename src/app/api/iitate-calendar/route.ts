import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month パラメータが必要です (YYYY-MM)' }, { status: 400 });
  }

  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  const supabase = getSupabaseAdmin();

  try {
    const [{ data: events, error: eventsError }, { data: monthNote, error: noteError }] = await Promise.all([
      supabase
        .from('iitate_calendar_events')
        .select('event_date, types, time_range, note')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true }),
      supabase
        .from('iitate_calendar_month_notes')
        .select('notes')
        .eq('year_month', month)
        .maybeSingle(),
    ]);

    if (eventsError || noteError) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({
      month,
      events: events ?? [],
      notes: monthNote?.notes ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

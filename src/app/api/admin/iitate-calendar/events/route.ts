import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { adminIitateCalendarEventCreateSchema, formatValidationErrors } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  const supabase = getSupabaseAdmin();
  let query = supabase.from('iitate_calendar_events').select('*').order('event_date', { ascending: true });

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthNum = Number(monthStr);
    const lastDay = new Date(year, monthNum, 0).getDate();
    query = query
      .gte('event_date', `${month}-01`)
      .lte('event_date', `${month}-${String(lastDay).padStart(2, '0')}`);
  }

  try {
    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = adminIitateCalendarEventCreateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
      { status: 400 }
    );
  }

  const { event_date, types, time_range, note } = parseResult.data;
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from('iitate_calendar_events')
      .insert({
        event_date,
        types,
        time_range: time_range || null,
        note: note || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'この日付にはすでにイベントが登録されています' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

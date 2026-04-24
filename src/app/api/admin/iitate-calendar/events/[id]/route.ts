import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { uuidSchema, adminIitateCalendarEventUpdateSchema, formatValidationErrors } from '@/lib/validation/schemas';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const idParse = uuidSchema.safeParse(id);
  if (!idParse.success) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = adminIitateCalendarEventUpdateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
      { status: 400 }
    );
  }

  const body = parseResult.data;
  const updates: Record<string, unknown> = {};
  if (body.event_date !== undefined) updates.event_date = body.event_date;
  if (body.types !== undefined) updates.types = body.types;
  if (body.time_range !== undefined) updates.time_range = body.time_range || null;
  if (body.note !== undefined) updates.note = body.note || null;

  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from('iitate_calendar_events')
      .update(updates)
      .eq('id', id)
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const idParse = uuidSchema.safeParse(id);
  if (!idParse.success) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { error } = await supabase.from('iitate_calendar_events').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

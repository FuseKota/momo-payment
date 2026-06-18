import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { deleteCalendarEvent } from '@/lib/google/calendar';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { writeAuditLog } from '@/lib/logging/audit-log';

/** DELETE: Google カレンダーの予定を削除 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const { eventId } = await params;
  if (!eventId) {
    return NextResponse.json({ error: 'event_id_required' }, { status: 400 });
  }

  try {
    await deleteCalendarEvent(eventId);
    revalidateTag('iitate-calendar');

    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'calendar.event_delete',
      targetType: 'calendar',
      targetId: eventId,
      metadata: {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    secureLog('error', 'Admin calendar event delete failed', safeErrorLog(error));
    return NextResponse.json({ error: 'calendar_delete_failed' }, { status: 502 });
  }
}

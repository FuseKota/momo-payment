import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminProductCreateSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order');

    if (error) {
      secureLog('error', 'Admin products list error', safeErrorLog(error));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    secureLog('error', 'Admin products list exception', safeErrorLog(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();
  const rawBody = await request.json();

  const parseResult = adminProductCreateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .insert(parseResult.data)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'このスラッグはすでに使われています' }, { status: 409 });
      }
      secureLog('error', 'Admin product create error', safeErrorLog(error));
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    secureLog('error', 'Admin product create exception', safeErrorLog(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

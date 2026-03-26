import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { adminProductReorderSchema, formatValidationErrors } from '@/lib/validation/schemas';

export async function PATCH(request: NextRequest) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parseResult = adminProductReorderSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
      { status: 400 }
    );
  }

  const { items } = parseResult.data;

  try {
    await Promise.all(
      items.map(({ id, sort_order }) =>
        supabase.from('products').update({ sort_order }).eq('id', id)
      )
    );

    return NextResponse.json({ updated: items.length });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Health check endpoint
 * - 200: アプリとDBが応答可能
 * - 503: 依存サービス不良
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {
    app: 'ok',
  };

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('products').select('id').limit(1);
    checks.database = error ? 'error' : 'ok';
  } catch {
    checks.database = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: allOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}

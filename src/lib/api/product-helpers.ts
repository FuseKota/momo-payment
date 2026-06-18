import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

/** DB から取得した商品の最小型 */
export interface FetchedProduct {
  id: string;
  name: string;
  name_zh_tw: string | null;
  name_en: string | null;
  kind: string;
  temp_zone: string;
  price_yen: number;
  can_pickup: boolean;
  can_ship: boolean;
  is_active: boolean;
}

interface ProductFetchSuccess {
  ok: true;
  products: FetchedProduct[];
}

interface ProductFetchFailure {
  ok: false;
  response: NextResponse;
}

export type ProductFetchResult = ProductFetchSuccess | ProductFetchFailure;

/**
 * 商品をDBから取得し、存在チェック + 利用可能チェック を行う
 */
export async function fetchAndValidateProducts(
  productIds: string[]
): Promise<ProductFetchResult> {
  const { data: products, error: productError } = await supabaseAdmin
    .from('products')
    .select(`id, name, name_zh_tw, name_en, kind, temp_zone, price_yen, can_pickup, can_ship, is_active`)
    .in('id', productIds);

  if (productError) {
    secureLog('error', 'DB error', safeErrorLog(productError));
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'db_error' },
        { status: 500 }
      ),
    };
  }

  const uniqueProductIds = [...new Set(productIds)];
  if (!products || products.length !== uniqueProductIds.length) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'product_not_found' },
        { status: 400 }
      ),
    };
  }

  // 利用可能チェック（配送可能か）
  for (const p of products) {
    if (!p.is_active || !p.can_ship) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: 'product_not_shippable', productId: p.id },
          { status: 400 }
        ),
      };
    }
  }

  return { ok: true, products: products as FetchedProduct[] };
}

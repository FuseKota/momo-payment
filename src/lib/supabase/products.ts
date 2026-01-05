import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/types/database';

const supabase = createClient();

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return data as Product[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }

  return data as Product;
}

export async function getProductsByKind(kind: 'FROZEN_FOOD' | 'GOODS'): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('kind', kind)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching products by kind:', error);
    return [];
  }

  return data as Product[];
}

export async function getShippableProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('can_ship', true)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching shippable products:', error);
    return [];
  }

  return data as Product[];
}

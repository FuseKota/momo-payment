import type { Product, FoodLabel } from '@/types/database';

export function getLocalizedName(product: Product, locale: string): string {
  if (locale === 'zh-tw' && product.name_zh_tw) return product.name_zh_tw;
  return product.name;
}

export function getLocalizedDescription(product: Product, locale: string): string | null {
  if (locale === 'zh-tw' && product.description_zh_tw) return product.description_zh_tw;
  return product.description;
}

export function getLocalizedFoodLabel(product: Product, locale: string): FoodLabel | null {
  if (locale === 'zh-tw' && product.food_label_zh_tw) return product.food_label_zh_tw;
  return product.food_label;
}

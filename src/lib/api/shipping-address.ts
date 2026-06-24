/**
 * 注文に紐づく配送先住所（埋め込み）の形状を正規化するヘルパー。
 *
 * PostgREST は `shipping_addresses.order_id` の UNIQUE 制約を one-to-one 関係と判定するため、
 * `orders` 側からの埋め込み（`select('... shipping_addresses(...)')`）の結果を
 * 「配列」ではなく「単一オブジェクト」で返す。
 *
 * 旧コードは配列前提（`[0]` / `.length` / `.map`）で書かれていたため、
 * 実際にはオブジェクトが返り住所が常に欠落していた（管理画面の住所非表示・CSVの住所空欄の原因）。
 * 配列・単一オブジェクト・null/undefined のいずれが来ても先頭の住所を取り出して正規化する。
 */
export function firstShippingAddress<T>(embedded: T | T[] | null | undefined): T | null {
  if (!embedded) return null;
  return Array.isArray(embedded) ? embedded[0] ?? null : embedded;
}

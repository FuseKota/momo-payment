/**
 * 配送料・お届け最短日の計算（サーバー / クライアント両用の純関数）
 *
 * 日付は全て "YYYY-MM-DD"（JST基準）の文字列で扱い、タイムゾーンずれを避ける。
 */
import {
  BOX_FEE_YEN,
  DELIVERY_DATE_MAX_OFFSET_DAYS,
  PREP_DAYS,
  ZONE_TO_BASE_FEE,
  resolvePrefData,
  type Zone,
} from './zones';

/** 全地帯で最大のお届け日数（pref 未確定時のフォールバック用）= 最遠 transit(3) + 準備(2) */
export const MAX_LEAD_TIME_DAYS = 3 + PREP_DAYS;

/** 都道府県名 → 地帯。未対応は null */
export function resolveZone(pref: string | null | undefined): Zone | null {
  return resolvePrefData(pref)?.zone ?? null;
}

/** 都道府県名 → 送料（基本運賃 + 箱代）。未対応は null */
export function calcShippingFee(pref: string | null | undefined): number | null {
  const data = resolvePrefData(pref);
  if (!data) return null;
  return ZONE_TO_BASE_FEE[data.zone] + BOX_FEE_YEN;
}

/** 都道府県名 → 最短お届けまでの日数（お届け日数 + 店側準備日数）。未対応は null */
export function calcLeadTimeDays(pref: string | null | undefined): number | null {
  const data = resolvePrefData(pref);
  if (!data) return null;
  return data.transit + PREP_DAYS;
}

// ---- YYYY-MM-DD ユーティリティ（UTC固定で日付計算しTZずれを排除） ----

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidYmd(ymd: string): boolean {
  if (!YMD_RE.test(ymd)) return false;
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function ymdToUtc(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToYmd(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" に n 日加算した "YYYY-MM-DD" を返す */
export function addDaysYmd(ymd: string, n: number): string {
  const dt = ymdToUtc(ymd);
  dt.setUTCDate(dt.getUTCDate() + n);
  return utcToYmd(dt);
}

/** JST基準の「今日」を "YYYY-MM-DD" で返す */
export function jstTodayYmd(): string {
  // en-CA ロケールは YYYY-MM-DD 形式
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** 最短お届け日（fromYmd + リードタイム）。未対応 pref は null */
export function calcMinDeliveryYmd(
  pref: string | null | undefined,
  fromYmd: string
): string | null {
  const lead = calcLeadTimeDays(pref);
  if (lead === null) return null;
  return addDaysYmd(fromYmd, lead);
}

/** お届け希望日として選択できる最終日（fromYmd + 14日） */
export function calcMaxDeliveryYmd(fromYmd: string): string {
  return addDaysYmd(fromYmd, DELIVERY_DATE_MAX_OFFSET_DAYS);
}

/**
 * お届け希望日が選択可能範囲内（最短日 〜 fromYmd+14日）かを判定。
 * pref 未対応・不正な日付は false。
 */
export function isDeliveryDateInRange(
  pref: string | null | undefined,
  dateYmd: string,
  fromYmd: string
): boolean {
  if (!isValidYmd(dateYmd)) return false;
  const min = calcMinDeliveryYmd(pref, fromYmd);
  if (min === null) return false;
  const max = calcMaxDeliveryYmd(fromYmd);
  return dateYmd >= min && dateYmd <= max;
}

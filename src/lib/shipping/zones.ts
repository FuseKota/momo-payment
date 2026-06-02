/**
 * 配送地帯と都道府県の対応（佐川急便 飛脚宅配便・福島発の運賃表に基づく）
 *
 * - 送料は「60サイズ固定 + 箱代」で算出する（calc.ts）。
 * - 沖縄県は運賃表の対象外（別途料金）のため、暫定的に南九州と同額で代用する。
 *   将来沖縄の正式運賃が決まったら ZONE_TO_BASE_FEE.OKINAWA を差し替えるだけでよい。
 */

/** 配送地帯 */
export type Zone =
  | 'KANTO' // 関東
  | 'SOUTH_TOHOKU' // 南東北
  | 'NORTH_TOHOKU' // 北東北
  | 'SHINETSU' // 信越
  | 'HOKURIKU' // 北陸
  | 'TOKAI' // 東海
  | 'KANSAI' // 関西
  | 'CHUGOKU' // 中国
  | 'SHIKOKU' // 四国
  | 'NORTH_KYUSHU' // 北九州
  | 'SOUTH_KYUSHU' // 南九州
  | 'HOKKAIDO' // 北海道
  | 'OKINAWA'; // 沖縄（南九州料金で代用）

/** 60サイズの地帯別基本運賃（円） */
export const ZONE_TO_BASE_FEE: Record<Zone, number> = {
  KANTO: 640,
  SOUTH_TOHOKU: 640,
  NORTH_TOHOKU: 650,
  SHINETSU: 650,
  HOKURIKU: 650,
  TOKAI: 650,
  KANSAI: 660,
  CHUGOKU: 670,
  SHIKOKU: 670,
  NORTH_KYUSHU: 670,
  HOKKAIDO: 670,
  SOUTH_KYUSHU: 680,
  OKINAWA: 680, // 運賃表対象外のため南九州料金で代用
};

/** 佐川急便の箱代（円／注文）。送料に必ず加算する */
export const BOX_FEE_YEN = 200;

/** 店側の配送準備にかかる日数（リードタイムに加算） */
export const PREP_DAYS = 2;

/** お届け希望日として選択できる「注文日からの最大日数」 */
export const DELIVERY_DATE_MAX_OFFSET_DAYS = 14;

interface PrefData {
  /** 送料地帯 */
  zone: Zone;
  /** 佐川のお届け日数（発送→到着の目安日数。店側準備は含まない） */
  transit: number;
}

/**
 * 都道府県（正式名）→ 地帯・お届け日数
 * 山梨は運賃上は関東だが、佐川リードタイム表では中部寄り（2日）のため transit=2 とする。
 */
const PREF_DATA: Record<string, PrefData> = {
  北海道: { zone: 'HOKKAIDO', transit: 2 },
  青森県: { zone: 'NORTH_TOHOKU', transit: 1 },
  岩手県: { zone: 'NORTH_TOHOKU', transit: 1 },
  秋田県: { zone: 'NORTH_TOHOKU', transit: 1 },
  宮城県: { zone: 'SOUTH_TOHOKU', transit: 1 },
  山形県: { zone: 'SOUTH_TOHOKU', transit: 1 },
  福島県: { zone: 'SOUTH_TOHOKU', transit: 1 },
  茨城県: { zone: 'KANTO', transit: 1 },
  栃木県: { zone: 'KANTO', transit: 1 },
  群馬県: { zone: 'KANTO', transit: 1 },
  埼玉県: { zone: 'KANTO', transit: 1 },
  千葉県: { zone: 'KANTO', transit: 1 },
  東京都: { zone: 'KANTO', transit: 1 },
  神奈川県: { zone: 'KANTO', transit: 1 },
  山梨県: { zone: 'KANTO', transit: 2 },
  新潟県: { zone: 'SHINETSU', transit: 2 },
  長野県: { zone: 'SHINETSU', transit: 2 },
  富山県: { zone: 'HOKURIKU', transit: 2 },
  石川県: { zone: 'HOKURIKU', transit: 2 },
  福井県: { zone: 'HOKURIKU', transit: 2 },
  岐阜県: { zone: 'TOKAI', transit: 2 },
  静岡県: { zone: 'TOKAI', transit: 2 },
  愛知県: { zone: 'TOKAI', transit: 2 },
  三重県: { zone: 'TOKAI', transit: 2 },
  滋賀県: { zone: 'KANSAI', transit: 2 },
  京都府: { zone: 'KANSAI', transit: 2 },
  大阪府: { zone: 'KANSAI', transit: 2 },
  兵庫県: { zone: 'KANSAI', transit: 2 },
  奈良県: { zone: 'KANSAI', transit: 2 },
  和歌山県: { zone: 'KANSAI', transit: 2 },
  鳥取県: { zone: 'CHUGOKU', transit: 2 },
  島根県: { zone: 'CHUGOKU', transit: 2 },
  岡山県: { zone: 'CHUGOKU', transit: 2 },
  広島県: { zone: 'CHUGOKU', transit: 2 },
  山口県: { zone: 'CHUGOKU', transit: 2 },
  徳島県: { zone: 'SHIKOKU', transit: 2 },
  香川県: { zone: 'SHIKOKU', transit: 2 },
  愛媛県: { zone: 'SHIKOKU', transit: 2 },
  高知県: { zone: 'SHIKOKU', transit: 2 },
  福岡県: { zone: 'NORTH_KYUSHU', transit: 3 },
  佐賀県: { zone: 'NORTH_KYUSHU', transit: 3 },
  長崎県: { zone: 'NORTH_KYUSHU', transit: 3 },
  大分県: { zone: 'NORTH_KYUSHU', transit: 3 },
  熊本県: { zone: 'SOUTH_KYUSHU', transit: 3 },
  宮崎県: { zone: 'SOUTH_KYUSHU', transit: 3 },
  鹿児島県: { zone: 'SOUTH_KYUSHU', transit: 3 },
  沖縄県: { zone: 'OKINAWA', transit: 3 },
};

/** 都道府県の「核」名称（接尾辞を除いた形）。北海道のみ例外で全体を保持 */
function coreName(officialName: string): string {
  if (officialName === '北海道') return '北海道';
  return officialName.replace(/[都府県]$/, '');
}

/**
 * 正式名（"東京都"）と核名称（"東京"）の両方で引けるルックアップ表。
 * 郵便番号APIは正式名を返し、手入力では接尾辞が落ちることがあるため両対応する。
 */
const PREF_LOOKUP: Map<string, PrefData> = (() => {
  const map = new Map<string, PrefData>();
  for (const [official, data] of Object.entries(PREF_DATA)) {
    map.set(official, data);
    map.set(coreName(official), data);
  }
  return map;
})();

/**
 * 入力された都道府県文字列を正規化（空白・全角空白を除去）
 */
export function normalizePref(input: string | null | undefined): string {
  return (input ?? '').replace(/[\s　]/g, '').trim();
}

/**
 * 都道府県名から地帯・お届け日数を解決する。未対応（不正な入力・沖縄以外の対象外）は null。
 */
export function resolvePrefData(pref: string | null | undefined): PrefData | null {
  const key = normalizePref(pref);
  if (!key) return null;
  return PREF_LOOKUP.get(key) ?? null;
}

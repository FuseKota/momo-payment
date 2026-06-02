import type { IitateCalendarEventType } from '@/types/database';
import type { GoogleCalendarEvent } from './types';

/**
 * Google カレンダーのイベントを、飯舘村台湾夜市カレンダーの公開 API レスポンス
 * （`{ event_date, types, time_range, note }`）へ変換する純粋関数群。
 *
 * 店舗スタッフは Google カレンダーに自然な日本語の予定名で入力する想定:
 *   「昼の部」13:00-16:00 / 「夜の部」17:00-21:00 / 「休園」（終日） /
 *   「もも娘ステージ」18:00-18:30
 * タイトル（＋説明）のキーワードからタイプを自動判定し、明示タグ `[day]` 等も補助的に拾う。
 */

const DEFAULT_TIMEZONE = 'Asia/Tokyo';

/** タイプ別キーワード（長い順に評価できるよう、note 抽出時はまとめてソートする） */
const TYPE_KEYWORDS: Record<IitateCalendarEventType, string[]> = {
  closed: ['休園', 'お休み', '定休', 'closed'],
  night: ['夜の部', '夜', 'ナイト', 'night'],
  day: ['昼の部', '昼', 'デイ', 'day'],
  stage: ['もも娘ステージ', 'ステージ', 'もも娘', 'ライブ', 'stage'],
};

const ALL_TYPES: IitateCalendarEventType[] = ['closed', 'day', 'night', 'stage'];

/** 出力イベント（公開 API レスポンスの 1 要素） */
export interface MappedCalendarEvent {
  event_date: string; // YYYY-MM-DD
  types: IitateCalendarEventType[];
  time_range: string | null;
  note: string | null;
}

/** 1 イベントを 1 日分へ展開した中間表現 */
interface DayContribution {
  event_date: string;
  types: IitateCalendarEventType[];
  /** 時刻付きイベントのみ。終日は null */
  startMin: number | null;
  endMin: number | null;
  note: string | null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' を UTC ミリ秒へ（終日イベントの日付計算用・TZ 非依存） */
function dateStrToUtcMs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** UTC ミリ秒を 'YYYY-MM-DD' へ */
function utcMsToDateStr(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** RFC3339 の dateTime を指定 TZ の { date, minutes } に変換 */
function toZonedParts(
  dateTime: string,
  timeZone: string
): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(dateTime));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  return { date, minutes };
}

function minutesToHm(min: number): string {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

/**
 * 時刻レンジ（例: 13:00〜16:00 / 13:00-16:00）を捉える正規表現。
 * 区切りは全角チルダ・各種ダッシュに加え、日本語入力で頻出する長音符類
 * （ー U+30FC / ― U+2015 / ｰ U+FF70 / − U+2212）にも対応する。
 */
const TIME_RANGE_RE = /(\d{1,2}):(\d{2})\s*[~～〜ー―ｰ\-–—−]\s*(\d{1,2}):(\d{2})/;
/** 単一時刻（例: 18:00）を捉える正規表現 */
const SINGLE_TIME_RE = /(\d{1,2}):(\d{2})/;

/** 時(0-23)・分(0-59)として妥当かを判定（価格・番号の "99:99" 等を時刻と誤認しないため） */
function isValidHm(h: string, m: string): boolean {
  return Number(h) <= 23 && Number(m) <= 59;
}

/**
 * 終日予定のタイトル等に文字で書かれた時刻（「13:00〜16:00」など）を分単位へ変換する。
 * 時刻付き(dateTime)イベントには使わず、終日イベントのフォールバックとして用いる。
 */
export function parseTimeFromText(text: string): { startMin: number; endMin: number | null } | null {
  const range = text.match(TIME_RANGE_RE);
  if (range && isValidHm(range[1], range[2]) && isValidHm(range[3], range[4])) {
    return {
      startMin: Number(range[1]) * 60 + Number(range[2]),
      endMin: Number(range[3]) * 60 + Number(range[4]),
    };
  }
  const single = text.match(SINGLE_TIME_RE);
  if (single && isValidHm(single[1], single[2])) {
    return { startMin: Number(single[1]) * 60 + Number(single[2]), endMin: null };
  }
  return null;
}

/**
 * テキスト（タイトル＋説明）からタイプを判定する。
 * 明示タグ `[day]` 等とキーワードの両方を拾い、union（重複排除）する。
 */
export function detectTypes(summary: string, description: string): IitateCalendarEventType[] {
  const haystack = `${summary} ${description}`.toLowerCase();
  const found = new Set<IitateCalendarEventType>();

  for (const type of ALL_TYPES) {
    // 明示タグ [day] など
    if (haystack.includes(`[${type}]`)) {
      found.add(type);
      continue;
    }
    // キーワード（日本語はそのまま、英字は小文字化済み）
    for (const kw of TYPE_KEYWORDS[type]) {
      if (haystack.includes(kw.toLowerCase())) {
        found.add(type);
        break;
      }
    }
  }

  return [...found];
}

/**
 * note を導出する。説明文（先頭の非空行）を優先し、無ければタイトルから
 * 認識済みのタグ・キーワードを除去した残りを使う。最大 200 字。
 */
export function deriveNote(summary: string, description: string): string | null {
  const descLine = description
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (descLine) return descLine.slice(0, 200);

  // タイトルからタグ・キーワード（長い順）・時刻表記を除去し、括弧や区切り記号を整理
  let rest = summary.replace(/\[[^\]]*\]/g, ' ');
  const phrases = ALL_TYPES.flatMap((t) => TYPE_KEYWORDS[t]).sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    rest = rest.split(phrase).join(' ');
  }
  // 時刻表記は time_range 側で扱うため note からは除去する。
  // 「レンジ（区切り文字ごと）→ 単一時刻」の順に消すことで、区切りに使われた長音符類が
  // note に残らないようにしつつ、語中の長音符（例: セレモニー）は保持する。
  rest = rest.replace(new RegExp(TIME_RANGE_RE.source, 'g'), ' ');
  rest = rest.replace(/\d{1,2}:\d{2}/g, ' ');
  rest = rest.replace(/[\s　,、。・/／\-–—~～〜|｜「」『』（）()【】［］]+/g, ' ').trim();
  return rest.length > 0 ? rest.slice(0, 200) : null;
}

/** 1 つの Google イベントを、含まれる各日への寄与に展開する */
function expandEvent(event: GoogleCalendarEvent, timeZone: string): DayContribution[] {
  if (event.status === 'cancelled') return [];

  const summary = event.summary ?? '';
  const description = event.description ?? '';
  const types = detectTypes(summary, description);
  const note = deriveNote(summary, description);

  // 時刻付きイベント
  if (event.start?.dateTime) {
    const start = toZonedParts(event.start.dateTime, timeZone);
    const end = event.end?.dateTime ? toZonedParts(event.end.dateTime, timeZone) : null;
    return [
      {
        event_date: start.date,
        types,
        startMin: start.minutes,
        // 終了が別日にまたがる場合は当日終端（23:59 相当を避け、開始のみ扱い）
        endMin: end && end.date === start.date ? end.minutes : null,
        note,
      },
    ];
  }

  // 終日イベント（end.date は排他的）
  if (event.start?.date) {
    // 終日予定でもタイトル/説明に時刻が書かれていれば time_range として拾う
    const textTime = parseTimeFromText(`${summary} ${description}`);
    const startMs = dateStrToUtcMs(event.start.date);
    const endMs = event.end?.date
      ? dateStrToUtcMs(event.end.date)
      : startMs + 86_400_000;
    const contributions: DayContribution[] = [];
    for (let ms = startMs; ms < endMs; ms += 86_400_000) {
      contributions.push({
        event_date: utcMsToDateStr(ms),
        types,
        startMin: textTime?.startMin ?? null,
        endMin: textTime?.endMin ?? null,
        note,
      });
    }
    return contributions;
  }

  return [];
}

/**
 * Google カレンダーのイベント配列を、指定月の公開 API イベント配列へ変換する。
 *
 * @param events Google Calendar events.list の items
 * @param month 対象月 'YYYY-MM'
 * @param timeZone 表示タイムゾーン（既定 Asia/Tokyo）
 */
export function mapGoogleEventsToMonth(
  events: GoogleCalendarEvent[],
  month: string,
  timeZone: string = DEFAULT_TIMEZONE
): MappedCalendarEvent[] {
  // 日付ごとに寄与を集約
  const byDate = new Map<
    string,
    {
      types: Set<IitateCalendarEventType>;
      startMin: number | null;
      endMin: number | null;
      notes: string[];
    }
  >();

  for (const event of events) {
    for (const c of expandEvent(event, timeZone)) {
      // 対象月の日付だけ採用
      if (c.event_date.slice(0, 7) !== month) continue;

      const agg = byDate.get(c.event_date) ?? {
        types: new Set<IitateCalendarEventType>(),
        startMin: null,
        endMin: null,
        notes: [],
      };

      for (const t of c.types) agg.types.add(t);
      if (c.startMin !== null) {
        agg.startMin = agg.startMin === null ? c.startMin : Math.min(agg.startMin, c.startMin);
      }
      if (c.endMin !== null) {
        agg.endMin = agg.endMin === null ? c.endMin : Math.max(agg.endMin, c.endMin);
      }
      if (c.note && !agg.notes.includes(c.note)) agg.notes.push(c.note);

      byDate.set(c.event_date, agg);
    }
  }

  const result: MappedCalendarEvent[] = [];
  for (const [event_date, agg] of byDate) {
    let time_range: string | null = null;
    if (agg.startMin !== null) {
      time_range =
        agg.endMin !== null
          ? `${minutesToHm(agg.startMin)}~${minutesToHm(agg.endMin)}`
          : minutesToHm(agg.startMin);
    }
    const note = agg.notes.length > 0 ? agg.notes.join(' / ').slice(0, 200) : null;
    result.push({
      event_date,
      types: [...agg.types],
      time_range,
      note,
    });
  }

  result.sort((a, b) => a.event_date.localeCompare(b.event_date));
  return result;
}

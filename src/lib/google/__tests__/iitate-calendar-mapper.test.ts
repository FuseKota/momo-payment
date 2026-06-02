import { describe, it, expect } from 'vitest';
import {
  mapGoogleEventsToMonth,
  detectTypes,
  deriveNote,
  parseTimeFromText,
} from '../iitate-calendar-mapper';
import type { GoogleCalendarEvent } from '../types';

/** 時刻付きイベント（Asia/Tokyo 想定。入力は +09:00 オフセット付きで与える） */
function timed(date: string, start: string, end: string, summary: string, description?: string): GoogleCalendarEvent {
  return {
    summary,
    description,
    start: { dateTime: `${date}T${start}:00+09:00`, timeZone: 'Asia/Tokyo' },
    end: { dateTime: `${date}T${end}:00+09:00`, timeZone: 'Asia/Tokyo' },
  };
}

/** 終日イベント（end.date は排他的） */
function allDay(startDate: string, endDate: string, summary: string): GoogleCalendarEvent {
  return { summary, start: { date: startDate }, end: { date: endDate } };
}

describe('detectTypes', () => {
  it('キーワードで昼/夜/休園/ステージを判定する', () => {
    expect(detectTypes('昼の部', '')).toEqual(['day']);
    expect(detectTypes('夜の部', '')).toEqual(['night']);
    expect(detectTypes('休園', '')).toEqual(['closed']);
    expect(detectTypes('もも娘ステージ', '')).toEqual(['stage']);
  });

  it('1つのタイトルから複数タイプを union する', () => {
    const types = detectTypes('もも娘ステージ（夜の部）', '');
    expect(types).toContain('stage');
    expect(types).toContain('night');
    expect(types).toHaveLength(2);
  });

  it('明示タグ [day] を拾う（大文字小文字無視）', () => {
    expect(detectTypes('[DAY] 特別営業', '')).toEqual(['day']);
  });

  it('説明文のキーワードも対象にする', () => {
    expect(detectTypes('特別営業', '本日は昼の部のみ')).toEqual(['day']);
  });

  it('該当キーワードが無ければ空配列', () => {
    expect(detectTypes('お知らせ', '詳細は後日')).toEqual([]);
  });
});

describe('deriveNote', () => {
  it('説明文の先頭非空行を優先する', () => {
    expect(deriveNote('昼の部', 'OPENセレモニー\n2行目')).toBe('OPENセレモニー');
  });

  it('説明が無ければタイトルからキーワード/タグを除去した残りを使う', () => {
    expect(deriveNote('昼の部 OPENセレモニー', '')).toBe('OPENセレモニー');
    // タグ・キーワードを全て除去して空になる場合は null
    expect(deriveNote('[stage] もも娘ライブ', '')).toBeNull();
  });

  it('残りが空なら null', () => {
    expect(deriveNote('昼の部', '')).toBeNull();
    expect(deriveNote('もも娘ステージ', '')).toBeNull();
  });

  it('200字で truncate する', () => {
    const long = 'あ'.repeat(300);
    expect(deriveNote('昼の部', long)?.length).toBe(200);
  });
});

describe('mapGoogleEventsToMonth', () => {
  const MONTH = '2026-06';

  it('時刻付きイベントから time_range を HH:MM~HH:MM で導出する', () => {
    const result = mapGoogleEventsToMonth([timed('2026-06-10', '13:00', '16:00', '昼の部')], MONTH);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      event_date: '2026-06-10',
      types: ['day'],
      time_range: '13:00~16:00',
    });
  });

  it('UTC 入力でも Asia/Tokyo へ +9 変換される', () => {
    // 04:00Z = 13:00 JST
    const ev: GoogleCalendarEvent = {
      summary: '昼の部',
      start: { dateTime: '2026-06-10T04:00:00Z' },
      end: { dateTime: '2026-06-10T07:00:00Z' },
    };
    const result = mapGoogleEventsToMonth([ev], MONTH);
    expect(result[0].event_date).toBe('2026-06-10');
    expect(result[0].time_range).toBe('13:00~16:00');
  });

  it('終日イベントは time_range が null、types は closed', () => {
    const result = mapGoogleEventsToMonth([allDay('2026-06-15', '2026-06-16', '休園')], MONTH);
    expect(result[0]).toMatchObject({
      event_date: '2026-06-15',
      types: ['closed'],
      time_range: null,
    });
  });

  it('同一日付の複数イベントを集約する（types union・range マージ・note 結合）', () => {
    const events = [
      timed('2026-06-20', '13:00', '16:00', '昼の部', 'デイタイム'),
      timed('2026-06-20', '17:00', '21:00', '夜の部', 'ナイトタイム'),
    ];
    const result = mapGoogleEventsToMonth(events, MONTH);
    expect(result).toHaveLength(1);
    const day = result[0];
    expect(day.types.sort()).toEqual(['day', 'night']);
    expect(day.time_range).toBe('13:00~21:00'); // 最早start〜最遅end
    expect(day.note).toBe('デイタイム / ナイトタイム');
  });

  it('複数日にまたがる終日イベントを各日へ展開する（end.date 排他）', () => {
    // 6/28〜6/30 の3日間休園（end.date = 7/1）
    const result = mapGoogleEventsToMonth([allDay('2026-06-28', '2026-07-01', '休園')], MONTH);
    expect(result.map((r) => r.event_date)).toEqual(['2026-06-28', '2026-06-29', '2026-06-30']);
    expect(result.every((r) => r.types[0] === 'closed')).toBe(true);
  });

  it('対象月外の日付は除外する', () => {
    // 5/31〜6/2 の終日イベント → 6月分のみ採用
    const result = mapGoogleEventsToMonth([allDay('2026-05-31', '2026-06-03', '休園')], MONTH);
    expect(result.map((r) => r.event_date)).toEqual(['2026-06-01', '2026-06-02']);
  });

  it('event_date 昇順でソートして返す', () => {
    const events = [
      timed('2026-06-20', '13:00', '16:00', '昼の部'),
      timed('2026-06-05', '13:00', '16:00', '昼の部'),
      timed('2026-06-12', '13:00', '16:00', '昼の部'),
    ];
    const result = mapGoogleEventsToMonth(events, MONTH);
    expect(result.map((r) => r.event_date)).toEqual(['2026-06-05', '2026-06-12', '2026-06-20']);
  });

  it('cancelled イベントは無視する', () => {
    const ev: GoogleCalendarEvent = {
      status: 'cancelled',
      summary: '昼の部',
      start: { dateTime: '2026-06-10T13:00:00+09:00' },
      end: { dateTime: '2026-06-10T16:00:00+09:00' },
    };
    expect(mapGoogleEventsToMonth([ev], MONTH)).toEqual([]);
  });

  it('終日予定のタイトルに書かれた時刻を time_range として拾い、note からは除去する', () => {
    // 店舗スタッフが終日予定のタイトルに「「昼の部」13:00〜16:00」と入力したケース
    const result = mapGoogleEventsToMonth([allDay('2026-06-02', '2026-06-03', '「昼の部」13:00〜16:00')], MONTH);
    expect(result[0]).toMatchObject({
      event_date: '2026-06-02',
      types: ['day'],
      time_range: '13:00~16:00',
      note: null,
    });
  });

  it('終日予定のタイトルに時刻＋メモがあれば time_range とメモを分離する', () => {
    const result = mapGoogleEventsToMonth([allDay('2026-06-04', '2026-06-05', '夜の部 17:00-21:00 OPENセレモニー')], MONTH);
    expect(result[0]).toMatchObject({
      event_date: '2026-06-04',
      types: ['night'],
      time_range: '17:00~21:00',
      note: 'OPENセレモニー',
    });
  });

  it('長音符ダッシュ「ー」で時刻が区切られても time_range を拾い、note には残さない', () => {
    // スタッフが「13:00ー16:00」と長音符（U+30FC）で区切って入力したケース
    const result = mapGoogleEventsToMonth([allDay('2026-06-06', '2026-06-07', '「昼の部」13:00ー16:00')], MONTH);
    expect(result[0]).toMatchObject({
      event_date: '2026-06-06',
      types: ['day'],
      time_range: '13:00~16:00',
      note: null,
    });
  });

  it('キーワード未マッチでも時刻・メモを持つ汎用イベントとして残す', () => {
    const result = mapGoogleEventsToMonth(
      [timed('2026-06-10', '10:00', '12:00', '特別イベント', '詳細あり')],
      MONTH
    );
    expect(result[0]).toMatchObject({
      event_date: '2026-06-10',
      types: [],
      time_range: '10:00~12:00',
      note: '詳細あり',
    });
  });
});

describe('parseTimeFromText', () => {
  it('全角チルダ・各種ダッシュ・長音符類のいずれの区切りでも時刻レンジを拾う', () => {
    for (const dash of ['~', '～', '〜', '-', '–', '—', 'ー', '―', 'ｰ', '−']) {
      expect(parseTimeFromText(`13:00${dash}16:00`)).toEqual({ startMin: 780, endMin: 960 });
    }
  });

  it('単一時刻は endMin=null で返す', () => {
    expect(parseTimeFromText('18:00 開始')).toEqual({ startMin: 1080, endMin: null });
  });

  it('時(0-23)・分(0-59)の範囲外（99:99 / 25:00 等）は時刻として採用しない', () => {
    expect(parseTimeFromText('抽選番号 99:99 当選')).toBeNull();
    expect(parseTimeFromText('25:00')).toBeNull();
    expect(parseTimeFromText('12:60')).toBeNull();
  });

  it('時刻が無ければ null', () => {
    expect(parseTimeFromText('お知らせ 詳細は後日')).toBeNull();
  });
});

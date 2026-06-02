/**
 * Google Calendar API（events.list）のレスポンスのうち、
 * 飯舘村台湾夜市カレンダーで利用する最小限のフィールド型。
 * @see https://developers.google.com/calendar/api/v3/reference/events/list
 */

/** イベントの開始/終了。終日イベントは `date`、時刻付きは `dateTime` を持つ */
export interface GoogleCalendarEventDateTime {
  /** 終日イベントの日付（YYYY-MM-DD） */
  date?: string;
  /** 時刻付きイベントの RFC3339 タイムスタンプ */
  dateTime?: string;
  /** dateTime に対応するタイムゾーン（例: Asia/Tokyo） */
  timeZone?: string;
}

/** events.list が返す 1 イベント（利用フィールドのみ） */
export interface GoogleCalendarEvent {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  colorId?: string;
  start?: GoogleCalendarEventDateTime;
  end?: GoogleCalendarEventDateTime;
}

/** events.list のレスポンス（利用フィールドのみ） */
export interface GoogleCalendarEventsListResponse {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
}

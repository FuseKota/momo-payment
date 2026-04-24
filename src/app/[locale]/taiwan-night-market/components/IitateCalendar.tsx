'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import styles from './IitateCalendar.module.css';
import type { IitateCalendarEventType } from '@/types/database';

interface CalendarDayEvent {
  types: IitateCalendarEventType[];
  time?: string | null;
  note?: string | null;
}

interface ApiEvent {
  event_date: string;
  types: IitateCalendarEventType[];
  time_range: string | null;
  note: string | null;
}

interface ApiResponse {
  month: string;
  events: ApiEvent[];
  notes: string[];
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <line x1="12" y1="2.2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="21.8" />
        <line x1="2.2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="21.8" y2="12" />
        <line x1="5.1" y1="5.1" x2="7" y2="7" />
        <line x1="17" y1="17" x2="18.9" y2="18.9" />
        <line x1="5.1" y1="18.9" x2="7" y2="17" />
        <line x1="17" y1="7" x2="18.9" y2="5.1" />
      </g>
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <path d="M15.5 3.5a9 9 0 1 0 5 11 7 7 0 0 1-5-11z" fill="currentColor" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="5" y1="5" x2="19" y2="19" />
        <line x1="19" y1="5" x2="5" y2="19" />
      </g>
    </svg>
  );
}

function IconStage({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <path
        d="M9 17.5V6l10-2v11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="17.5" r="2.2" fill="currentColor" />
      <circle cx="17" cy="15" r="2.2" fill="currentColor" />
    </svg>
  );
}

function EventIcons({ types }: { types: IitateCalendarEventType[] }) {
  return (
    <div className={styles.icons}>
      {types.includes('closed') && <IconClose className={`${styles.icon} ${styles.iconClose}`} />}
      {types.includes('day') && <IconSun className={`${styles.icon} ${styles.iconSun}`} />}
      {types.includes('night') && <IconMoon className={`${styles.icon} ${styles.iconMoon}`} />}
      {types.includes('stage') && <IconStage className={`${styles.icon} ${styles.iconStage}`} />}
    </div>
  );
}

export default function IitateCalendar() {
  const t = useTranslations('taiwanNightMarket');
  const locale = useLocale();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [monthData, setMonthData] = useState<{ events: Record<number, CalendarDayEvent>; notes: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const month = useMemo(() => monthKey(cursor.year, cursor.month), [cursor]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/iitate-calendar?month=${month}`)
      .then((res) => (res.ok ? (res.json() as Promise<ApiResponse>) : null))
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setMonthData(null);
          return;
        }
        const eventMap: Record<number, CalendarDayEvent> = {};
        for (const e of data.events) {
          const day = Number(e.event_date.slice(8, 10));
          eventMap[day] = { types: e.types, time: e.time_range, note: e.note };
        }
        setMonthData({ events: eventMap, notes: data.notes });
      })
      .catch(() => {
        if (!cancelled) setMonthData(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const weekdays = useMemo(
    () => [
      t('calendar.sun'),
      t('calendar.mon'),
      t('calendar.tue'),
      t('calendar.wed'),
      t('calendar.thu'),
      t('calendar.fri'),
      t('calendar.sat'),
    ],
    [t]
  );

  const { leadingEmpty, daysInMonth } = useMemo(() => {
    const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
    const last = new Date(cursor.year, cursor.month + 1, 0).getDate();
    return { leadingEmpty: firstDay, daysInMonth: last };
  }, [cursor]);

  const goPrev = () =>
    setCursor((c) => {
      const d = new Date(c.year, c.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const goNext = () =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const monthLabel = new Intl.DateTimeFormat(locale === 'zh-tw' ? 'zh-TW' : 'ja-JP', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(cursor.year, cursor.month, 1));

  const hasAnyEvents = monthData && Object.keys(monthData.events).length > 0;

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>{t('iitateCalendar.title')}</h2>

        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navButton}
            onClick={goPrev}
            aria-label={t('iitateCalendar.prev')}
          >
            ‹ {t('iitateCalendar.prev')}
          </button>
          <span className={styles.navLabel}>{monthLabel}</span>
          <button
            type="button"
            className={styles.navButton}
            onClick={goNext}
            aria-label={t('iitateCalendar.next')}
          >
            {t('iitateCalendar.next')} ›
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.monthBlock}>
              <span className={styles.monthNumber}>{cursor.month + 1}</span>
              <span className={styles.year}>{cursor.year}</span>
            </div>
            <div className={styles.calendarTitle}>{t('iitateCalendar.headerTitle')}</div>
          </div>

          <div className={styles.grid}>
            {weekdays.map((w, idx) => (
              <div
                key={w}
                className={`${styles.weekdayCell} ${idx === 6 ? styles.weekdaySat : ''}`}
              >
                {w}
              </div>
            ))}

            {Array.from({ length: leadingEmpty }).map((_, i) => (
              <div key={`empty-${i}`} className={`${styles.dayCell} ${styles.dayEmpty}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dow = (leadingEmpty + i) % 7;
              const event = monthData?.events[day];
              return (
                <div key={day} className={styles.dayCell}>
                  <span className={`${styles.dayNumber} ${dow === 6 ? styles.dayNumberSat : ''}`}>
                    {day}
                  </span>
                  {event && <EventIcons types={event.types} />}
                  {event?.time && <span className={styles.time}>{event.time}</span>}
                  {event?.note && <span className={styles.note}>{event.note}</span>}
                </div>
              );
            })}
          </div>

          <div className={styles.legend}>
            <div className={styles.legendRow}>
              <span className={styles.legendItem}>
                <IconClose className={styles.legendIcon} /> {t('iitateCalendar.legendClosed')}
              </span>
              <span className={styles.legendItem}>
                <IconSun className={styles.legendIcon} /> {t('iitateCalendar.legendDay')}
              </span>
              <span className={styles.legendItem}>
                <IconMoon className={styles.legendIcon} /> {t('iitateCalendar.legendNight')}
              </span>
              <span className={styles.legendItem}>
                <IconStage className={styles.legendIcon} /> {t('iitateCalendar.legendStage')}
              </span>
            </div>
            <div className={styles.legendNote}>{t('iitateCalendar.disclaimer')}</div>
            {monthData?.notes.map((note, i) => (
              <div key={i} className={styles.legendExtra}>
                {note}
              </div>
            ))}
            {!isLoading && !hasAnyEvents && (
              <div className={styles.legendExtra}>{t('iitateCalendar.noEvents')}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { translateAdminError, adminNetworkErrorMessage } from '@/lib/admin/error-messages';

/** 予定種別（Google 予定タイトルのキーワードに対応） */
type EventType = 'day' | 'night' | 'stage' | 'closed';
const EVENT_TYPE_LABELS: Record<EventType, string> = {
  day: '昼の部',
  night: '夜の部',
  stage: 'もも娘ステージ',
  closed: '休園',
};

interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

interface EventForm {
  date: string;
  type: EventType;
  startTime: string;
  endTime: string;
  note: string;
}

const defaultEventForm: EventForm = {
  date: '',
  type: 'day',
  startTime: '',
  endTime: '',
  note: '',
};

/** 予定の日付・時間帯の表示用ラベル */
function formatEventLine(ev: CalendarEvent): string {
  const startStr = ev.start?.dateTime ?? ev.start?.date ?? '';
  const [, mm, dd] = startStr.slice(0, 10).split('-');
  const datePart = mm && dd ? `${Number(mm)}/${Number(dd)}` : '';
  if (ev.start?.dateTime && ev.end?.dateTime) {
    return `${datePart} ${ev.start.dateTime.slice(11, 16)}〜${ev.end.dateTime.slice(11, 16)}`;
  }
  return datePart;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayYm(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}

function ymKey(year: number, month: number): string {
  return `${year}-${pad2(month + 1)}`;
}

export default function AdminIitateCalendarPage() {
  const [cursor, setCursor] = useState(todayYm());
  const [monthNotes, setMonthNotes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 取得失敗（カレンダー連携エラー等）と「予定0件（空状態）」を区別するための state
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventForm, setEventForm] = useState<EventForm>(defaultEventForm);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const month = useMemo(() => ymKey(cursor.year, cursor.month), [cursor]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [notesRes, eventsRes] = await Promise.all([
        fetch(`/api/admin/iitate-calendar/month-notes?month=${month}`),
        fetch(`/api/admin/iitate-calendar/events?month=${month}`),
      ]);
      if (notesRes.ok) {
        const data = await notesRes.json();
        setMonthNotes(data.notes ?? []);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events ?? []);
      } else {
        // events の非ok（特に 502 calendar_fetch_failed）を握り潰さず、
        // 空状態と区別してエラー文言を出す
        setEvents([]);
        const body = await eventsRes.json().catch(() => null);
        const message = translateAdminError(body, eventsRes.status, 'カレンダーの読み込みに失敗しました');
        setLoadError(message);
        setSnackbar({ open: true, message });
      }
      // notes 単体の取得失敗も握り潰さない（events が成功していてもエラーを通知）
      if (!notesRes.ok) {
        const body = await notesRes.json().catch(() => null);
        const message = translateAdminError(body, notesRes.status, '月別ノートの読み込みに失敗しました');
        setLoadError((prev) => prev ?? message);
        setSnackbar({ open: true, message });
      }
    } catch {
      // 通信断・例外時もスピナーで固まらせず、ネットワークエラー文言を出す
      const message = adminNetworkErrorMessage();
      setLoadError(message);
      setSnackbar({ open: true, message });
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goPrev = () => {
    const d = new Date(cursor.year, cursor.month - 1, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const goNext = () => {
    const d = new Date(cursor.year, cursor.month + 1, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const handleAddEvent = async () => {
    if (!eventForm.date) {
      setSnackbar({ open: true, message: '日付を入力してください' });
      return;
    }
    setIsSavingEvent(true);
    try {
      const body =
        eventForm.type === 'closed'
          ? { date: eventForm.date, type: eventForm.type, note: eventForm.note || undefined }
          : {
              date: eventForm.date,
              type: eventForm.type,
              startTime: eventForm.startTime || undefined,
              endTime: eventForm.endTime || undefined,
              note: eventForm.note || undefined,
            };
      const res = await fetch('/api/admin/iitate-calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSnackbar({ open: true, message: '予定を追加しました' });
        setEventForm({ ...defaultEventForm, date: eventForm.date });
        await fetchData();
      } else {
        const body = await res.json().catch(() => null);
        setSnackbar({ open: true, message: translateAdminError(body, res.status, '予定の追加に失敗しました') });
      }
    } catch {
      setSnackbar({ open: true, message: adminNetworkErrorMessage() });
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setDeletingId(eventId);
    try {
      const res = await fetch(`/api/admin/iitate-calendar/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        setSnackbar({ open: true, message: '予定を削除しました' });
      } else {
        const body = await res.json().catch(() => null);
        setSnackbar({ open: true, message: translateAdminError(body, res.status, '予定の削除に失敗しました') });
      }
    } catch {
      setSnackbar({ open: true, message: adminNetworkErrorMessage() });
    } finally {
      setDeletingId(null);
    }
  };

  const openNotesDialog = () => {
    setNotesDraft(monthNotes.join('\n---\n'));
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const notes = notesDraft
        .split('\n---\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/admin/iitate-calendar/month-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year_month: month, notes }),
      });
      if (res.ok) {
        const saved = await res.json();
        setMonthNotes(saved.notes ?? []);
        setSnackbar({ open: true, message: '月別ノートを保存しました' });
        setNotesDialogOpen(false);
      } else {
        const body = await res.json().catch(() => null);
        setSnackbar({ open: true, message: translateAdminError(body, res.status, '月別ノートの保存に失敗しました') });
      }
    } catch {
      setSnackbar({ open: true, message: adminNetworkErrorMessage() });
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
          飯舘村台湾夜市カレンダー
        </Typography>
        <Button variant="contained" startIcon={<EditNoteIcon />} onClick={openNotesDialog}>
          月別ノート編集
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          日毎の営業日は下の「営業日の予定」から登録できます（Google カレンダーへ直接入力した予定も反映されます）
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          管理画面から追加した予定は Google カレンダーへ書き込まれ、サイトのカレンダーに即時反映されます
          （Google カレンダー側で直接編集した場合は最大1時間程度で反映）。種別は予定タイトルから自動判定されます:
        </Typography>
        <Typography variant="body2" component="div" sx={{ pl: 1 }}>
          ・「昼の部」→ 昼 / 「夜の部」→ 夜 / 「休園」→ 休園日 / 「もも娘ステージ」→ ステージ
          <br />
          ・開始/終了時刻を設定すると「13:00~16:00」のように時間帯が表示されます（終日予定は時刻なし）。
          <br />
          ・補足メモは予定の「説明」欄に記入してください。
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          下の「月別ノート編集」は、カレンダー下部に表示するその月全体の補足（注意書き等）専用です。
        </Typography>
      </Alert>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <IconButton onClick={goPrev} aria-label="前の月">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" sx={{ minWidth: 160, textAlign: 'center' }}>
          {cursor.year}年{cursor.month + 1}月
        </Typography>
        <IconButton onClick={goNext} aria-label="次の月">
          <ChevronRightIcon />
        </IconButton>
      </Paper>

      {/* 営業日の予定（Google カレンダーへ書き込む） */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          営業日の予定（{month}）
        </Typography>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          useFlexGap
          flexWrap="wrap"
          sx={{ mb: 3, alignItems: { md: 'flex-end' } }}
        >
          <TextField
            type="date"
            label="日付"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={eventForm.date}
            onChange={(e) => setEventForm((p) => ({ ...p, date: e.target.value }))}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>種別</InputLabel>
            <Select
              label="種別"
              value={eventForm.type}
              onChange={(e) => setEventForm((p) => ({ ...p, type: e.target.value as EventType }))}
            >
              {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => (
                <MenuItem key={t} value={t}>
                  {EVENT_TYPE_LABELS[t]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {eventForm.type !== 'closed' && (
            <>
              <TextField
                type="time"
                label="開始"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={eventForm.startTime}
                onChange={(e) => setEventForm((p) => ({ ...p, startTime: e.target.value }))}
              />
              <TextField
                type="time"
                label="終了"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={eventForm.endTime}
                onChange={(e) => setEventForm((p) => ({ ...p, endTime: e.target.value }))}
              />
            </>
          )}
          <TextField
            label="メモ（任意）"
            size="small"
            value={eventForm.note}
            onChange={(e) => setEventForm((p) => ({ ...p, note: e.target.value }))}
            sx={{ flexGrow: 1, minWidth: 160 }}
          />
          <Button variant="contained" onClick={handleAddEvent} disabled={isSavingEvent}>
            {isSavingEvent ? <CircularProgress size={20} /> : '追加'}
          </Button>
        </Stack>

        {loadError ? (
          // 取得失敗（空状態と区別）: エラー文言＋再読み込み導線
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography variant="body2" color="error">
              {loadError}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              disabled={isLoading}
            >
              再読み込み
            </Button>
          </Stack>
        ) : events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            この月の予定はまだありません
          </Typography>
        ) : (
          <Stack spacing={0}>
            {events.map((ev) => (
              <Box
                key={ev.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  py: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatEventLine(ev)}　{ev.summary}
                  </Typography>
                  {ev.description && (
                    <Typography variant="caption" color="text.secondary">
                      {ev.description}
                    </Typography>
                  )}
                </Box>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteEvent(ev.id)}
                  disabled={deletingId === ev.id}
                  aria-label="予定を削除"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 3, backgroundColor: '#fff8e1' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            月別ノート（{month}）
          </Typography>
          {monthNotes.length > 0 ? (
            <Stack spacing={0.5}>
              {monthNotes.map((note, i) => (
                <Typography key={i} variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {note}
                </Typography>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              この月の月別ノートはまだありません
            </Typography>
          )}
        </Paper>
      )}

      <Dialog open={notesDialogOpen} onClose={() => setNotesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>月別ノート編集 ({month})</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            カレンダー下部に表示される補足情報です。複数のノートは「---」の行で区切ってください。
          </Typography>
          <TextField
            multiline
            rows={8}
            fullWidth
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder={'4月18日 18:00〜18:30\n福島もも娘🍑ステージ\n---\n別のノート'}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setNotesDialogOpen(false)} disabled={isSavingNotes}>
            キャンセル
          </Button>
          <Button variant="contained" onClick={handleSaveNotes} disabled={isSavingNotes}>
            {isSavingNotes ? <CircularProgress size={24} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}

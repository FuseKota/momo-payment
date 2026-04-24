'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
  Snackbar,
  FormControl,
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormLabel,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { IitateCalendarEvent, IitateCalendarEventType } from '@/types/database';

interface EventFormData {
  event_date: string;
  types: IitateCalendarEventType[];
  time_range: string;
  note: string;
}

const TYPE_OPTIONS: { value: IitateCalendarEventType; label: string }[] = [
  { value: 'day', label: '昼の部' },
  { value: 'night', label: '夜の部' },
  { value: 'closed', label: '休園日' },
  { value: 'stage', label: '福島もも娘🍑ステージ' },
];

const TYPE_LABEL: Record<IitateCalendarEventType, string> = {
  day: '昼',
  night: '夜',
  closed: '休',
  stage: 'ステージ',
};

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
  const [events, setEvents] = useState<IitateCalendarEvent[]>([]);
  const [monthNotes, setMonthNotes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<IitateCalendarEvent | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    event_date: '',
    types: [],
    time_range: '',
    note: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const month = useMemo(() => ymKey(cursor.year, cursor.month), [cursor]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventsRes, notesRes] = await Promise.all([
        fetch(`/api/admin/iitate-calendar/events?month=${month}`),
        fetch(`/api/admin/iitate-calendar/month-notes?month=${month}`),
      ]);
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (notesRes.ok) {
        const data = await notesRes.json();
        setMonthNotes(data.notes ?? []);
      }
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

  const handleOpenDialog = (event?: IitateCalendarEvent, defaultDate?: string) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        event_date: event.event_date,
        types: event.types,
        time_range: event.time_range ?? '',
        note: event.note ?? '',
      });
    } else {
      setEditingEvent(null);
      setFormData({
        event_date: defaultDate ?? `${month}-01`,
        types: [],
        time_range: '',
        note: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEvent(null);
  };

  const toggleType = (t: IitateCalendarEventType) => {
    setFormData((p) =>
      p.types.includes(t)
        ? { ...p, types: p.types.filter((x) => x !== t) }
        : { ...p, types: [...p.types, t] }
    );
  };

  const handleSave = async () => {
    if (!formData.event_date || formData.types.length === 0) {
      setSnackbar({ open: true, message: '日付とタイプは必須です' });
      return;
    }
    setIsSaving(true);
    try {
      const url = editingEvent
        ? `/api/admin/iitate-calendar/events/${editingEvent.id}`
        : '/api/admin/iitate-calendar/events';
      const method = editingEvent ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: formData.event_date,
          types: formData.types,
          time_range: formData.time_range || null,
          note: formData.note || null,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        if (editingEvent) {
          setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? saved : e)));
        } else {
          setEvents((prev) => [...prev, saved].sort((a, b) => a.event_date.localeCompare(b.event_date)));
        }
        setSnackbar({ open: true, message: editingEvent ? '更新しました' : '追加しました' });
        handleCloseDialog();
      } else {
        const err = await res.json();
        setSnackbar({ open: true, message: err.error || '保存に失敗しました' });
      }
    } catch {
      setSnackbar({ open: true, message: '保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/iitate-calendar/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setSnackbar({ open: true, message: '削除しました' });
      }
    } catch {
      setSnackbar({ open: true, message: '削除に失敗しました' });
    } finally {
      setDeleteConfirmId(null);
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
        const err = await res.json();
        setSnackbar({ open: true, message: err.error || '保存に失敗しました' });
      }
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
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={openNotesDialog}>
            月別ノート編集
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            イベント追加
          </Button>
        </Stack>
      </Box>

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

      {monthNotes.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#fff8e1' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            月別ノート
          </Typography>
          {monthNotes.map((note, i) => (
            <Typography key={i} variant="body2" sx={{ whiteSpace: 'pre-line', mb: 0.5 }}>
              {note}
            </Typography>
          ))}
        </Paper>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>日付</TableCell>
                <TableCell>タイプ</TableCell>
                <TableCell>時間帯</TableCell>
                <TableCell>メモ</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {event.event_date}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {event.types.map((t) => (
                        <Chip key={t} label={TYPE_LABEL[t]} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{event.time_range ?? '-'}</TableCell>
                  <TableCell>{event.note ?? '-'}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={() => handleOpenDialog(event)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteConfirmId(event.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">この月のイベントはまだありません</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEvent ? 'イベントを編集' : 'イベントを追加'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                label="日付"
                type="date"
                fullWidth
                required
                value={formData.event_date}
                onChange={(e) => setFormData((p) => ({ ...p, event_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">タイプ（複数選択可）</FormLabel>
                <FormGroup row>
                  {TYPE_OPTIONS.map((opt) => (
                    <FormControlLabel
                      key={opt.value}
                      control={
                        <Checkbox
                          checked={formData.types.includes(opt.value)}
                          onChange={() => toggleType(opt.value)}
                        />
                      }
                      label={opt.label}
                    />
                  ))}
                </FormGroup>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <TextField
                label="時間帯（任意）"
                fullWidth
                value={formData.time_range}
                onChange={(e) => setFormData((p) => ({ ...p, time_range: e.target.value }))}
                placeholder="13:00~16:00"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="メモ（任意）"
                fullWidth
                value={formData.note}
                onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                placeholder="OPENセレモニー など"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog} disabled={isSaving}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || !formData.event_date || formData.types.length === 0}
          >
            {isSaving ? <CircularProgress size={24} /> : editingEvent ? '保存' : '追加'}
          </Button>
        </DialogActions>
      </Dialog>

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

      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>イベントを削除しますか？</DialogTitle>
        <DialogContent>
          <Typography>この操作は元に戻せません。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>キャンセル</Button>
          <Button color="error" variant="contained" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
            削除
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

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
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

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
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const month = useMemo(() => ymKey(cursor.year, cursor.month), [cursor]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const notesRes = await fetch(`/api/admin/iitate-calendar/month-notes?month=${month}`);
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
        <Button variant="contained" startIcon={<EditNoteIcon />} onClick={openNotesDialog}>
          月別ノート編集
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          日毎の営業日は Google カレンダーで管理します
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          共有された Google カレンダーに予定を登録すると、サイトのカレンダーに自動反映されます（最大1時間程度で反映）。
          予定のタイトルに次の語を含めるとアイコンが自動で付きます:
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

---
description: 会話とplanの内容をplan.mdに保存し、関連ブランチを作成（移動はしない）
allowed-tools: Bash, Read, Write
---

# Save Plan & Create Branch

現在の会話で議論した計画内容を `.claude/plan/plan.md` に保存し、対応するブランチを作成する（ブランチへの移動はしない）。

## 入力

$ARGUMENTS

引数がある場合はブランチ名のヒントとして使用する。

## 手順

### 1. 計画内容の整理

会話の中で議論された以下の情報を整理する:

- 問題の背景・発見経緯
- 根本原因の分析
- 修正方針
- 修正手順（ステップ別）
- 修正ファイル一覧
- 検証方法

### 2. plan.md への保存

整理した内容を `.claude/plan/plan.md` に上書き保存する。

フォーマット:

```markdown
# [計画タイトル]

## 問題の発見経緯

...

## 根本原因

...

## 修正方針

...

## 修正手順

### Step 1: ...

### Step 2: ...

## 修正ファイル一覧

| ファイル | 変更 |
| -------- | ---- |

## 検証

1. ...
```

### 3. ブランチ名の決定

計画内容から適切なブランチ名を決定する。

命名規則:

- `feat/` — 新機能
- `fix/` — バグ修正
- `refactor/` — リファクタリング
- `chore/` — 設定・ツール変更

例: `fix/deadline-display-inconsistency`

### 4. ブランチの作成（移動しない）

```bash
git branch <branch-name>
```

**注意**: `git checkout` や `git switch` は実行しない。ブランチを作成するだけ。

### 5. 結果報告

- 保存先: `.claude/plan/plan.md`
- 作成したブランチ名
- 次のステップ（`git switch <branch-name>` で移動して作業開始）

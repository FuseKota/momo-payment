---
description: PRを作成（動作確認・スクショ・issue紐付け必須）
allowed-tools: Bash, Read, Glob, Grep, mcp__chrome-devtools__take_screenshot, mcp__chrome-devtools__navigate_page, mcp__chrome-devtools__take_snapshot
---

# Pull Request 作成

変更内容を確認し、動作確認を行った上でPRを作成する。

## 手順

### 1. 変更内容の確認

```bash
git log main..HEAD --oneline
git diff main...HEAD --stat
```

### 2. コード品質チェック（PR作成前ゲート）

以下を順番に実行し、**すべてパスするまでPR作成に進まない**。
エラーがあれば自動修正を試み、修正不可能な場合はユーザーに報告して中断する。

```bash
# Lint
pnpm run lint

# Format（.md含む全ファイル）
pnpm run format:check

# TypeScript 型チェック
pnpm run typecheck

# Build
pnpm run build
```

エラー時の自動修正:

```bash
# lint エラー → 自動修正を試行
pnpm run lint:fix

# format エラー → 自動修正を試行
pnpm run format
```

自動修正後に再度チェックを実行し、パスを確認すること。

### 3. 動作確認項目の洗い出し

変更内容から動作確認項目を列挙する：

- 新機能: 期待通り動作するか
- バグ修正: 修正後に問題が解消されているか
- 副作用: 既存機能に影響がないか
- エッジケース: 境界値や異常系の動作

### 4. 動作確認の実施

各確認項目について実際に確認を行う：

1. 開発サーバーを起動（必要に応じて）
2. 各項目を順番に確認
3. 確認結果を記録（OK / NG）

**フロントエンド変更がある場合:**

- 変更前（main ブランチ）のスクリーンショットを撮影
- 変更後（現在のブランチ）のスクリーンショットを撮影
- ビフォーアフターを比較できるよう準備

### 5. PR 作成

```bash
gh pr create --title "タイトル" --body "$(cat <<'EOF'
## 概要

[変更の目的・背景を簡潔に説明]

## 変更内容

- [変更点1]
- [変更点2]

## スクリーンショット

<!-- フロントエンド変更がある場合のみ -->

| Before | After |
|--------|-------|
| ![before](URL) | ![after](URL) |

## 動作確認

- [x] 確認項目1
- [x] 確認項目2
- [x] 確認項目3

## 関連 Issue

Closes #[issue番号]

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## チェックリスト

PR作成前に以下を確認：

| 項目         | 必須     | 確認内容                             |
| ------------ | -------- | ------------------------------------ |
| Issue 紐付け | ✅       | `Closes #番号` で関連issueを紐付け   |
| 変更概要     | ✅       | 何をなぜ変更したか簡潔に記載         |
| 動作確認     | ✅       | 全ての確認項目を実施・記録           |
| スクショ     | 条件付き | フロント変更時はビフォーアフター必須 |
| テスト       | ✅       | `pnpm test` がパスすること           |
| ビルド       | ✅       | `pnpm build` がパスすること          |

## スクリーンショットの撮り方

### Chrome DevTools MCP を使用

```
1. navigate_page でページを開く
2. take_screenshot でスクリーンショットを撮影
3. 画像ファイルを GitHub にアップロード
```

### 手動の場合

1. main ブランチに切り替えて撮影
2. 作業ブランチに戻って撮影
3. PR 作成時にドラッグ&ドロップでアップロード

## 注意事項

- 動作確認を省略しない（レビュアーの負担軽減）
- スクショは変更箇所が明確にわかるものを選ぶ
- 大きな変更は複数のPRに分割を検討
- WIP の場合は Draft PR として作成

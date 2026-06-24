# 本番公開 残タスク（LAUNCH TODO）

最終更新: 2026-06-24

dev/prod分離・セキュリティ対応の過程で出た、本番公開までの未了タスク。
凡例: ☐ 未了 / ☑ 完了 ／ 担当: **[開発]** **[社長/ドメイン管理]** **[業務判断]**

> 接続情報の実値（プロジェクトref・APIキー・管理者メール等）は `.env.local` を参照。
> このファイルを公開リポジトリにコミットする場合は、秘密情報・個人情報を書かないこと。

---

## A. メール送信（Resend + 独自ドメイン）★社長の作業待ち

送信元を `info@sakura-sisters.com` にする。コード側は `EMAIL_FROM` 駆動で対応済み。
現状の送信元 `onboarding@resend.dev` は Resend登録者本人にしか届かない＝**本番では注文確認/会員登録メールが未達**。

- ☐ **[社長]** Resend → Domains → Add Domain `sakura-sisters.com` → 提示DNSレコードを取得
- ☐ **[社長]** Xserver「DNSレコード設定」にResendのレコードを追加（SPFは1ドメイン1本にマージ）→ **Verified**
- ☐ **[社長→開発]** 認証したResendアカウントの **APIキー（`re_...`）** を共有
- ☐ **[開発]** Netlify env: `EMAIL_FROM=info@sakura-sisters.com` ＋ `RESEND_API_KEY=<上記>`
- ☐ **[開発]** ローカル `.env.local` も同様に更新
- ☐ **[開発]** Supabase カスタムSMTP（Auth → SMTP）: sender=`info@sakura-sisters.com` / host=`smtp.resend.com` / port=`465` / user=`resend` / pass=APIキー
- ☐ **[開発]** Auth → Rate Limits の「sending emails」上限を引き上げ
- ☐ **[開発]** 外部アドレスへテスト送信（会員登録確認＋注文確認が届くか）
- ☑ **[開発]** コード: 送信元ハードコード無し・`EMAIL_FROM` 駆動を確認、stale fallback修正（`resend.ts`）
- ⚠ 要確認: 現 `.env.local` の `RESEND_API_KEY` が社長アカウントと同一か（同一なら手戻り減）

## B. Supabase Auth Attack Protection（新本番）[開発・ダッシュボード]

Pro化済みで利用可。login直送のブルートフォース対策。

- ☑ 漏洩パスワード保護ON ＋ 最小パスワード長8（2026-06-10完了）。アプリ側も最小8＋`passwordWeak`メッセージに対応済（`login/page.tsx`・ja/zh-tw・202テスト通過）
- ☑ Auth → Rate Limits の「sign-ups and sign-ins」確認（30/5分のまま）
- ☐ (任意) CAPTCHA：**有効化前にフロント実装が必須**（hCaptcha/Turnstile + `captchaToken`）。未実装でONにすると本番のログイン/新規登録が全停止

## C. サイト用ドメイン `momomusume.com`（未登録）[開発/業務]

メール用 `sakura-sisters.com` とは別。サイトURL系に使う。

- ☐ レジストラで取得（Netlify直 / Cloudflare / お名前.com 等）＋ Whois代行ON
- ☐ DNSをNetlifyに接続
- ☐ 反映: `NEXT_PUBLIC_APP_URL` / Supabase Auth の Site URL・Redirect URLs / Stripe Webhook / SEO(robots/sitemap)

## D. 本番カットオーバー（dev/prod分離の仕上げ）[開発]

- ☑ 新本番に管理者作成（2026-06-16）
- ☑ Netlify env を新本番Supabaseに切替（`URL`/`ANON`/`SERVICE_ROLE`・Clear cache & deploy 済、2026-06-16）
- ☑ 新本番へスキーマ＋コンテンツ＋画像を移行（migration `00001`〜`00027` を dev/prod 両方へ適用済）
- ☐ **Stripe Webhook を本番エンドポイントに登録**（`sk_live_`/`whsec_` 更新、events: `checkout.session.completed` / `checkout.session.expired`）
- ☐ **Confirm email を再ON**（A の Resend 独自ドメイン認証後。現状はサインアップ500回避のため暫定OFF）
- ☐ 切替後の最終動作確認（商品表示 / 画像 / 管理ログイン / テスト注文・決済）

## E. セキュリティ残（任意 / 業務判断）

- ☐ **[業務判断]** 沖縄県の送料が暫定（南九州と同額）。本番前に実費確定 or 配送対象外を決定（`src/lib/shipping/zones.ts`）
- ☐ (任意) gitleaks を GitHub Actions CI に追加（秘密コミットの再発防止）
- ☑ 在庫売り越し対策（配送注文で在庫チェック＋Webhookで `decrement_variant_stock` 減算。2026-06-23確認）
- ☑ レート制限の永続化（Supabase RPC `check_rate_limit`・`00016`。サーバレスで有効）
- ☑ Vercelトークン revoke（git履歴の漏洩・2026-06-10対応、gitleaksで全履歴クリーン確認）
- ☑ Next.js 15.5.19 昇格・PII Cache-Control・variant `is_active`・DB advisor 固定 等

## F. 法令対応（特商法・食品表示法・個人情報保護法ほか）[開発/業務判断/専門家確認]

本番サイト（taiwanyoichi-momomusume.com）の法令適合チェック（2026-06-24）で出た対応・残項目。
☑ は 2026-06-24 のコミット（食品表示 `54e7a0c` / 最終確認画面 `4fc3709` / プライバシー・特商法 `da69856`）で対応済み。

> ⚠ 最終的な適法性判断は弁護士等の専門家確認を推奨（以下は一般的な必要項目との差分チェック）。

### 実装済み（2026-06-24）
- ☑ 食品表示法: 冷凍食品の商品ページに原材料・アレルゲン・賞味期限・保存方法・製造者・栄養成分を表示（管理画面入力は ja/zh-tw/en 対応、`food_label`）
- ☑ 改正特商法12条の6: 決済最終確認画面に支払方法・時期＋返品特約＋特商法リンクを表示
- ☑ 個人情報保護法: プライバシーに所在地・代表者名・具体的な安全管理措置・委託先/越境移転（Stripe＝米国 等）・制定改定日を追記
- ☑ 改正電気通信事業法(外部送信規律): Cookie記述を実態（第三者アクセス解析は未使用）に整合
- ☑ 特商法: 不備・破損時返品の送料負担（当社負担）・返金方法を明記

### 残タスク
- ☐ **[社長/業務]（最重要）** 特商法ページの**電話番号がプレースホルダー**のまま（`legal.phoneValue` = `○○-○○○○-○○○○`）。実電話番号への差し替えが必須。番号確定後、`messages/{ja,zh-tw,en}.json` の `legal.phoneValue` を更新（開発対応・即時反映可）
- ☐ **[社長/業務]** 英訳の固有名詞の正式表記確認: 代表者 `Chihiro Minegishi`／住所 `361 Hara, Iitoi, Iitate-mura, Soma-gun, Fukushima 960-1721, Japan`（暫定の標準綴り）。正式表記があれば `messages/{zh-tw,en}.json` の `legal.privacyContact*` を差し替え
- ☐ **[運用]** 食品データ入力: 今後追加する冷凍食品ごとに、管理画面で `food_label`（特にアレルゲン）を入力する運用
- ☐ **[業務/専門家]** 景表法: 「自然由来」台湾消しゴムの表示根拠（実素材）を確認。事実と異なる場合は商品名・表示を是正
- ☐ **[開発/業務]** 利用規約（Terms）ページ未作成（法的必須ではないがトラブル予防に推奨）。希望時に作成
- ☐ **[業務]** 食品衛生法: 冷凍食品の通信販売に必要な営業許可の取得状況を確認

---

### 依存関係メモ
- **A（メール）** は社長のResend/Xserver作業が前提 → それ待ち。
- **C（momomusume.com）** はサイトURL系（Auth Site URL・Stripe Webhook）の前提 → カットオーバー前に決めると手戻りが少ない。
- **D（カットオーバー）** は B・C を済ませてから実施するのが理想（空き本番への切替・URL不一致を避ける）。

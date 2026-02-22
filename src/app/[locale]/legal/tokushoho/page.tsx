import { useTranslations } from 'next-intl';

export default function TokushohoPage() {
  const t = useTranslations('legal');
  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="mb-8 text-2xl font-bold">{t('tokushohoTitle')}</h1>
        {/* TODO: 特商法表記を実装 */}
        <p className="text-zinc-600">{t('comingSoon')}</p>
      </main>
    </div>
  );
}

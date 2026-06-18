import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { localeUrl, languageAlternates } from '@/lib/seo/locale-url';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taiwanyoichi-momomusume.com';
  return {
    title: t('contactTitle'),
    description: t('contactDescription'),
    alternates: {
      canonical: localeUrl(appUrl, locale, '/contact'),
      languages: languageAlternates(appUrl, '/contact'),
    },
    openGraph: {
      title: t('contactTitle'),
      description: t('contactDescription'),
      url: localeUrl(appUrl, locale, '/contact'),
      type: 'website',
    },
  };
}

export default function ContactPage() {
  const t = useTranslations('legal');
  const tc = useTranslations('common');

  const rows = [
    { label: t('businessName'), value: t('businessNameValue'), isEmail: false },
    { label: t('email'), value: t('emailValue'), isEmail: true },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-900 hover:opacity-70">
          ← {tc('back')}
        </Link>
        <h1 className="mb-4 text-2xl font-bold">{t('contactTitle')}</h1>
        <p className="mb-8 text-sm text-zinc-700 whitespace-pre-line">{t('contactIntro')}</p>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-100 last:border-0">
                  <th className="w-40 bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-900 align-top">
                    {row.label}
                  </th>
                  <td className="px-4 py-3 text-zinc-900">
                    {row.isEmail ? (
                      <a href={`mailto:${row.value}`} className="text-pink-600 hover:underline">
                        {row.value}
                      </a>
                    ) : (
                      row.value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

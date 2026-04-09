import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  return {
    title: t('tokushohoTitle'),
    description: t('tokushohoTitle'),
  };
}

export default function TokushohoPage() {
  const t = useTranslations('legal');
  const tc = useTranslations('common');

  const rows = [
    { label: t('businessName'), value: t('businessNameValue') },
    { label: t('representative'), value: t('representativeValue') },
    { label: t('address'), value: t('addressValue') },
    { label: t('phone'), value: t('phoneValue') },
    { label: t('email'), value: t('emailValue') },
    { label: t('price'), value: t('priceValue') },
    { label: t('shippingFeeLabel'), value: t('shippingFeeValue') },
    { label: t('payment'), value: t('paymentValue') },
    { label: t('paymentTiming'), value: t('paymentTimingValue') },
    { label: t('deliveryTiming'), value: t('deliveryTimingValue') },
    { label: t('returns'), value: t('returnsValue') },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-900 hover:opacity-70">
          ← {tc('back')}
        </Link>
        <h1 className="mb-8 text-2xl font-bold">{t('tokushohoTitle')}</h1>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-100 last:border-0">
                  <th className="w-40 bg-zinc-50 px-4 py-3 text-left font-medium text-zinc-900 align-top">
                    {row.label}
                  </th>
                  <td className="px-4 py-3 text-zinc-900 whitespace-pre-line">
                    {row.value}
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

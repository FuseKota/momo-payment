import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function PrivacyPage() {
  const t = useTranslations('legal');
  const tc = useTranslations('common');

  const sections = [
    { title: t('privacyCollectionTitle'), text: t('privacyCollectionText') },
    { title: t('privacyPurposeTitle'), text: t('privacyPurposeText') },
    { title: t('privacyThirdPartyTitle'), text: t('privacyThirdPartyText') },
    { title: t('privacyCookieTitle'), text: t('privacyCookieText') },
    { title: t('privacyManagementTitle'), text: t('privacyManagementText') },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-900 hover:opacity-70">
          ← {tc('back')}
        </Link>
        <h1 className="mb-8 text-2xl font-bold">{t('privacyTitle')}</h1>
        <div className="space-y-8">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="mb-2 text-base font-semibold text-zinc-900">
                {i + 1}. {section.title}
              </h2>
              <p className="text-sm text-zinc-900 whitespace-pre-line leading-relaxed">
                {section.text}
              </p>
            </section>
          ))}

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-900">
              {sections.length + 1}. {t('privacyContactTitle')}
            </h2>
            <p className="text-sm text-zinc-900 leading-relaxed">{t('privacyContactText')}</p>
            <div className="mt-2 space-y-1 text-sm text-zinc-900">
              <p>{t('privacyContactBusiness')}</p>
              <p>{t('privacyContactEmail')}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

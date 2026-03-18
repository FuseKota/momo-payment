import { useTranslations } from 'next-intl';

export default function PrivacyPage() {
  const t = useTranslations('legal');

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
        <h1 className="mb-8 text-2xl font-bold">{t('privacyTitle')}</h1>
        <div className="space-y-8">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="mb-2 text-base font-semibold text-zinc-800">
                {i + 1}. {section.title}
              </h2>
              <p className="text-sm text-zinc-600 whitespace-pre-line leading-relaxed">
                {section.text}
              </p>
            </section>
          ))}

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-800">
              {sections.length + 1}. {t('privacyContactTitle')}
            </h2>
            <p className="text-sm text-zinc-600 leading-relaxed">{t('privacyContactText')}</p>
            <div className="mt-2 space-y-1 text-sm text-zinc-600">
              <p>{t('privacyContactBusiness')}</p>
              <p>{t('privacyContactEmail')}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

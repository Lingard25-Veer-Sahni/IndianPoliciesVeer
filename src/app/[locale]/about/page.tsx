import { useTranslations } from 'next-intl';

export default function AboutPage() {
  const t = useTranslations('about');

  const sections = [
    ['missionTitle', 'mission'],
    ['whatWeDoTitle', 'whatWeDo'],
    ['whatWeDontTitle', 'whatWeDont'],
    ['languagesTitle', 'languages'],
    ['ttsTitle', 'tts'],
    ['contactTitle', 'contact'],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
      <div className="mt-8 space-y-8">
        {sections.map(([titleKey, bodyKey]) => (
          <section key={titleKey}>
            <h2 className="text-lg font-semibold text-navy">{t(titleKey)}</h2>
            <p className="mt-2 leading-relaxed text-gray-700">{t(bodyKey)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

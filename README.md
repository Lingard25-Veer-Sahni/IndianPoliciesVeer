# IndianPolicy

An independent, non-governmental "policy clarity" site for India — modeled on the idea behind
clearpolicy.org, but covering Indian government policies, in 7 languages, with text-to-speech.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- `next-intl` for internationalization (routing, translations)
- Web Speech API (`SpeechSynthesis`) for text-to-speech — runs entirely in the browser, no API keys, no cost
- No backend / database — content lives in `src/data/policies.ts`

## Languages

English (`en`), Hindi (`hi`), Tamil (`ta`), Marathi (`mr`), Malayalam (`ml`), Bengali (`bn`), Kannada (`kn`).
Every page is available at `/{locale}/...`, e.g. `/hi/policies`, `/ta/about`.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
```

```bash
npm run build && npm start   # production build
```

## Project structure

```
src/
  app/[locale]/            # pages (home, policies, policies/[slug], about, disclaimer, privacy)
  components/              # Header, Footer, LanguageSwitcher, PolicyCard, PolicyBrowser, TextToSpeech, SampleBadge
  data/policies.ts         # policy content, per-language, one object per policy
  messages/{locale}.json   # all UI copy + legal text, per language
  i18n/                    # next-intl routing/config
```

## Important: this is a demo build, not a finished product

To keep scope manageable, this build ships with **8 illustrative sample policy entries**
(RTI Act, Ayushman Bharat, GST, NEP 2020, DPDP Act, Swachh Bharat, PMAY, Digital India).
They're real, well-known, publicly documented policies, described factually and neutrally,
each linked to its real official government source — but the summaries are simplified and
**have not been through independent legal/editorial review**. Every page says this explicitly
(sample badges, in-page warnings, the Disclaimer page).

Before treating this as a real public product, you should:

1. **Get every summary reviewed** by someone qualified (or at least cross-checked carefully
   against the official source) before removing the "sample entry" labeling.
2. **Get the machine-translated Hindi/Tamil/Marathi/Malayalam/Bengali/Kannada text checked
   by a native speaker**, ideally someone with legal/policy-writing experience. The English
   copy was hand-written; the other six languages were produced with AI assistance in this
   session and are flagged as such on every policy page and in the Disclaimer.
3. **Add more policies.** The data model (`src/data/policies.ts`) is set up so adding a new
   entry just means adding one object with `title`/`summary` per language, category, year,
   ministry, and an official source URL.
4. **Decide on a hosting/domain and re-check the legal pages** (Disclaimer, Privacy) reflect
   reality — e.g. if you add analytics, a contact form, or accounts, the Privacy Policy's
   DPDP Act section will need to be updated to match what's actually collected.

## Text-to-speech

The "Listen" button on each policy page uses your browser's built-in `speechSynthesis` API,
picking a voice that matches the current language (e.g. `hi-IN`, `ta-IN`). This is free and
requires no setup, but **voice availability depends on the visitor's device/OS/browser** —
Chrome and Edge on most systems have decent Indian-language voice coverage; other
browsers may have gaps for Tamil/Malayalam/Bengali/Kannada. If a voice isn't found, the UI
shows a message rather than failing silently.

If you later want more consistent voice quality across all visitors, swap `TextToSpeech.tsx`
to call a cloud TTS API (Google Cloud TTS, Azure Speech, Amazon Polly all support these
languages) — the component is small and isolated specifically so that's a contained change.

## Legal/compliance choices baked in (see Disclaimer & Privacy pages)

- Prominent "not affiliated with the Government of India" notice in the footer of every page
  and as the first item on the Disclaimer page.
- "Not legal advice" notice.
- Neutral, non-partisan tone in all summaries — no commentary on parties/leaders.
- Every policy links to its real official government source ("sources you can check").
- Translation-accuracy disclaimer (AI-assisted, not certified) on every policy page and in
  the Disclaimer.
- Privacy Policy references India's Digital Personal Data Protection Act, 2023 (DPDP Act) —
  written for the current no-account, no-form, no-tracking state of the demo; update it if
  you add analytics, forms, or accounts.
- TTS runs client-side only — no text is sent to a third party for the speech feature.

None of this is a substitute for actual legal review — if this goes live publicly, it's worth
having an Indian media/tech lawyer glance over the Disclaimer and Privacy pages once real
content and any data collection are finalized.

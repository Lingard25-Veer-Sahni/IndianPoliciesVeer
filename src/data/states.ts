import type { Locale } from '@/i18n/routing';

// The 28 states + 8 Union Territories of India. Used by the state-specific
// law lookup feature: a visitor picks their state so the site can show them
// policies that apply there (currently every policy in policies.ts is a
// central law, which applies everywhere in India regardless of state, but
// this list is what future state-specific entries will reference via the
// Policy.states field — see policies.ts).
export interface IndianState {
  /** kebab-case identifier, referenced by Policy.states */
  slug: string;
  /** Whether this is a state or a union territory (shown as a UI hint only). */
  kind: 'state' | 'union-territory';
  name: Record<Locale, string>;
}

export const indianStates: IndianState[] = [
  { slug: 'andhra-pradesh', kind: 'state', name: { en: 'Andhra Pradesh', hi: 'आंध्र प्रदेश', ta: 'ஆந்திரப் பிரதேசம்', mr: 'आंध्र प्रदेश', ml: 'ആന്ധ്രാപ്രദേശ്', bn: 'অন্ধ্রপ্রদেশ', kn: 'ಆಂಧ್ರ ಪ್ರದೇಶ' } },
  { slug: 'arunachal-pradesh', kind: 'state', name: { en: 'Arunachal Pradesh', hi: 'अरुणाचल प्रदेश', ta: 'அருணாசலப் பிரதேசம்', mr: 'अरुणाचल प्रदेश', ml: 'അരുണാചൽ പ്രദേശ്', bn: 'অরুণাচল প্রদেশ', kn: 'ಅರುಣಾಚಲ ಪ್ರದೇಶ' } },
  { slug: 'assam', kind: 'state', name: { en: 'Assam', hi: 'असम', ta: 'அசாம்', mr: 'आसाम', ml: 'അസം', bn: 'অসম', kn: 'ಅಸ್ಸಾಂ' } },
  { slug: 'bihar', kind: 'state', name: { en: 'Bihar', hi: 'बिहार', ta: 'பீகார்', mr: 'बिहार', ml: 'ബിഹാർ', bn: 'বিহার', kn: 'ಬಿಹಾರ' } },
  { slug: 'chhattisgarh', kind: 'state', name: { en: 'Chhattisgarh', hi: 'छत्तीसगढ़', ta: 'சத்தீஸ்கர்', mr: 'छत्तीसगड', ml: 'ഛത്തീസ്ഗഢ്', bn: 'ছত্তিশগড়', kn: 'ಛತ್ತೀಸ್‌ಗಢ' } },
  { slug: 'goa', kind: 'state', name: { en: 'Goa', hi: 'गोवा', ta: 'கோவா', mr: 'गोवा', ml: 'ഗോവ', bn: 'গোয়া', kn: 'ಗೋವಾ' } },
  { slug: 'gujarat', kind: 'state', name: { en: 'Gujarat', hi: 'गुजरात', ta: 'குஜராத்', mr: 'गुजरात', ml: 'ഗുജറാത്ത്', bn: 'গুজরাট', kn: 'ಗುಜರಾತ್' } },
  { slug: 'haryana', kind: 'state', name: { en: 'Haryana', hi: 'हरियाणा', ta: 'ஹரியானா', mr: 'हरियाणा', ml: 'ഹരിയാന', bn: 'হরিয়ানা', kn: 'ಹರಿಯಾಣ' } },
  { slug: 'himachal-pradesh', kind: 'state', name: { en: 'Himachal Pradesh', hi: 'हिमाचल प्रदेश', ta: 'இமாசலப் பிரதேசம்', mr: 'हिमाचल प्रदेश', ml: 'ഹിമാചൽ പ്രദേശ്', bn: 'হিমাচল প্রদেশ', kn: 'ಹಿಮಾಚಲ ಪ್ರದೇಶ' } },
  { slug: 'jharkhand', kind: 'state', name: { en: 'Jharkhand', hi: 'झारखंड', ta: 'ஜார்க்கண்ட்', mr: 'झारखंड', ml: 'ജാർഖണ്ഡ്', bn: 'ঝাড়খণ্ড', kn: 'ಜಾರ್ಖಂಡ್' } },
  { slug: 'karnataka', kind: 'state', name: { en: 'Karnataka', hi: 'कर्नाटक', ta: 'கர்நாடகா', mr: 'कर्नाटक', ml: 'കർണാടക', bn: 'কর্ণাটক', kn: 'ಕರ್ನಾಟಕ' } },
  { slug: 'kerala', kind: 'state', name: { en: 'Kerala', hi: 'केरल', ta: 'கேரளா', mr: 'केरळ', ml: 'കേരളം', bn: 'কেরালা', kn: 'ಕೇರಳ' } },
  { slug: 'madhya-pradesh', kind: 'state', name: { en: 'Madhya Pradesh', hi: 'मध्य प्रदेश', ta: 'மத்தியப் பிரதேசம்', mr: 'मध्य प्रदेश', ml: 'മധ്യപ്രദേശ്', bn: 'মধ্যপ্রদেশ', kn: 'ಮಧ್ಯ ಪ್ರದೇಶ' } },
  { slug: 'maharashtra', kind: 'state', name: { en: 'Maharashtra', hi: 'महाराष्ट्र', ta: 'மகாராஷ்டிரா', mr: 'महाराष्ट्र', ml: 'മഹാരാഷ്ട്ര', bn: 'মহারাষ্ট্র', kn: 'ಮಹಾರಾಷ್ಟ್ರ' } },
  { slug: 'manipur', kind: 'state', name: { en: 'Manipur', hi: 'मणिपुर', ta: 'மணிப்பூர்', mr: 'मणिपूर', ml: 'മണിപ്പൂർ', bn: 'মণিপুর', kn: 'ಮಣಿಪುರ' } },
  { slug: 'meghalaya', kind: 'state', name: { en: 'Meghalaya', hi: 'मेघालय', ta: 'மேகாலயா', mr: 'मेघालय', ml: 'മേഘാലയ', bn: 'মেঘালয়', kn: 'ಮೇಘಾಲಯ' } },
  { slug: 'mizoram', kind: 'state', name: { en: 'Mizoram', hi: 'मिज़ोरम', ta: 'மிசோரம்', mr: 'मिझोराम', ml: 'മിസോറാം', bn: 'মিজোরাম', kn: 'ಮಿಜೋರಾಂ' } },
  { slug: 'nagaland', kind: 'state', name: { en: 'Nagaland', hi: 'नागालैंड', ta: 'நாகாலாந்து', mr: 'नागालँड', ml: 'നാഗാലാൻഡ്', bn: 'নাগাল্যান্ড', kn: 'ನಾಗಾಲ್ಯಾಂಡ್' } },
  { slug: 'odisha', kind: 'state', name: { en: 'Odisha', hi: 'ओडिशा', ta: 'ஒடிசா', mr: 'ओडिशा', ml: 'ഒഡിഷ', bn: 'ওড়িশা', kn: 'ಒಡಿಶಾ' } },
  { slug: 'punjab', kind: 'state', name: { en: 'Punjab', hi: 'पंजाब', ta: 'பஞ்சாப்', mr: 'पंजाब', ml: 'പഞ്ചാബ്', bn: 'পাঞ্জাব', kn: 'ಪಂಜಾಬ್' } },
  { slug: 'rajasthan', kind: 'state', name: { en: 'Rajasthan', hi: 'राजस्थान', ta: 'ராஜஸ்தான்', mr: 'राजस्थान', ml: 'രാജസ്ഥാൻ', bn: 'রাজস্থান', kn: 'ರಾಜಸ್ಥಾನ' } },
  { slug: 'sikkim', kind: 'state', name: { en: 'Sikkim', hi: 'सिक्किम', ta: 'சிக்கிம்', mr: 'सिक्कीम', ml: 'സിക്കിം', bn: 'সিকিম', kn: 'ಸಿಕ್ಕಿಂ' } },
  { slug: 'tamil-nadu', kind: 'state', name: { en: 'Tamil Nadu', hi: 'तमिलनाडु', ta: 'தமிழ்நாடு', mr: 'तमिळनाडू', ml: 'തമിഴ്‌നാട്', bn: 'তামিলনাড়ু', kn: 'ತಮಿಳುನಾಡು' } },
  { slug: 'telangana', kind: 'state', name: { en: 'Telangana', hi: 'तेलंगाना', ta: 'தெலங்காணா', mr: 'तेलंगणा', ml: 'തെലങ്കാന', bn: 'তেলেঙ্গানা', kn: 'ತೆಲಂಗಾಣ' } },
  { slug: 'tripura', kind: 'state', name: { en: 'Tripura', hi: 'त्रिपुरा', ta: 'திரிபுரா', mr: 'त्रिपुरा', ml: 'ത്രിപുര', bn: 'ত্রিপুরা', kn: 'ತ್ರಿಪುರ' } },
  { slug: 'uttar-pradesh', kind: 'state', name: { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश', ta: 'உத்தரப் பிரதேசம்', mr: 'उत्तर प्रदेश', ml: 'ഉത്തർപ്രദേശ്', bn: 'উত্তরপ্রদেশ', kn: 'ಉತ್ತರ ಪ್ರದೇಶ' } },
  { slug: 'uttarakhand', kind: 'state', name: { en: 'Uttarakhand', hi: 'उत्तराखंड', ta: 'உத்தராகண்ட்', mr: 'उत्तराखंड', ml: 'ഉത്തരാഖണ്ഡ്', bn: 'উত্তরাখণ্ড', kn: 'ಉತ್ತರಾಖಂಡ' } },
  { slug: 'west-bengal', kind: 'state', name: { en: 'West Bengal', hi: 'पश्चिम बंगाल', ta: 'மேற்கு வங்காளம்', mr: 'पश्चिम बंगाल', ml: 'പശ്ചിമ ബംഗാൾ', bn: 'পশ্চিমবঙ্গ', kn: 'ಪಶ್ಚಿಮ ಬಂಗಾಳ' } },
  { slug: 'andaman-and-nicobar-islands', kind: 'union-territory', name: { en: 'Andaman and Nicobar Islands', hi: 'अंडमान और निकोबार द्वीप समूह', ta: 'அந்தமான் நிக்கோபார் தீவுகள்', mr: 'अंदमान आणि निकोबार बेटे', ml: 'ആൻഡമാൻ നിക്കോബാർ ദ്വീപുകൾ', bn: 'আন্দামান ও নিকোবর দ্বীপপুঞ্জ', kn: 'ಅಂಡಮಾನ್ ಮತ್ತು ನಿಕೋಬಾರ್ ದ್ವೀಪಗಳು' } },
  { slug: 'chandigarh', kind: 'union-territory', name: { en: 'Chandigarh', hi: 'चंडीगढ़', ta: 'சண்டிகர்', mr: 'चंदीगड', ml: 'ചണ്ഡീഗഢ്', bn: 'চণ্ডীগড়', kn: 'ಚಂಡೀಗಢ' } },
  { slug: 'dadra-and-nagar-haveli-and-daman-and-diu', kind: 'union-territory', name: { en: 'Dadra and Nagar Haveli and Daman and Diu', hi: 'दादरा और नगर हवेली तथा दमन और दीव', ta: 'தாத்ரா நகர் அவேலி மற்றும் தாமன் தியூ', mr: 'दादरा आणि नगर हवेली आणि दमण आणि दीव', ml: 'ദാദ്ര, നഗർ ഹവേലി, ദാമൻ, ദിയു', bn: 'দাদরা ও নগর হাভেলি এবং দমন ও দিউ', kn: 'ದಾದ್ರ ಮತ್ತು ನಗರ್ ಹವೇಲಿ ಮತ್ತು ದಮನ್ ಮತ್ತು ದಿಯು' } },
  { slug: 'delhi', kind: 'union-territory', name: { en: 'Delhi (NCT)', hi: 'दिल्ली (राष्ट्रीय राजधानी क्षेत्र)', ta: 'டெல்லி (தேசிய தலைநகர் பகுதி)', mr: 'दिल्ली (राष्ट्रीय राजधानी क्षेत्र)', ml: 'ഡൽഹി (ദേശീയ തലസ്ഥാന മേഖല)', bn: 'দিল্লি (জাতীয় রাজধানী অঞ্চল)', kn: 'ದೆಹಲಿ (ರಾಷ್ಟ್ರೀಯ ರಾಜಧಾನಿ ಪ್ರದೇಶ)' } },
  { slug: 'jammu-and-kashmir', kind: 'union-territory', name: { en: 'Jammu and Kashmir', hi: 'जम्मू और कश्मीर', ta: 'ஜம்மு காஷ்மீர்', mr: 'जम्मू आणि काश्मीर', ml: 'ജമ്മു കശ്മീർ', bn: 'জম্মু ও কাশ্মীর', kn: 'ಜಮ್ಮು ಮತ್ತು ಕಾಶ್ಮೀರ' } },
  { slug: 'ladakh', kind: 'union-territory', name: { en: 'Ladakh', hi: 'लद्दाख', ta: 'லடாக்', mr: 'लडाख', ml: 'ലഡാക്', bn: 'লাদাখ', kn: 'ಲಡಾಖ್' } },
  { slug: 'lakshadweep', kind: 'union-territory', name: { en: 'Lakshadweep', hi: 'लक्षद्वीप', ta: 'இலட்சத்தீவு', mr: 'लक्षद्वीप', ml: 'ലക്ഷദ്വീപ്', bn: 'লক্ষদ্বীপ', kn: 'ಲಕ್ಷದ್ವೀಪ' } },
  { slug: 'puducherry', kind: 'union-territory', name: { en: 'Puducherry', hi: 'पुदुचेरी', ta: 'புதுச்சேரி', mr: 'पुदुच्चेरी', ml: 'പുതുച്ചേരി', bn: 'পুদুচেরি', kn: 'ಪುದುಚೇರಿ' } },
];

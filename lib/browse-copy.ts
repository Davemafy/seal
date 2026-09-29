import type {BrowseCase} from './browse-cases';
import type {DisplayLocale} from './ui-locales';

type CardCopy=Pick<BrowseCase,'title'|'classification'|'visualNote'>;

const COPY:Partial<Record<Exclude<DisplayLocale,'en'>,Record<string,CardCopy>>>={
 fr:{
  'dallas-traffic-qr-scam':{title:'Avis de défaut routier avec paiement par QR code',classification:'Exemple d’arnaque confirmé',visualNote:'Faux en-tête de tribunal, numéro de dossier, avertissement de défaut et paiement demandé par QR code.'},
  'maryland-court-text-scam':{title:'SMS judiciaire avec fausse audience et demande de paiement',classification:'Exemple d’arnaque confirmé',visualNote:'Un SMS imitant un tribunal combine une instruction d’audience, une demande de paiement et un QR code fictif.'},
  'connecticut-sample-jury-summons':{title:'Exemple de convocation fédérale de juré',classification:'Exemple/formulaire légitime',visualNote:'Document de référence publié par un tribunal montrant la structure et la densité d’une convocation officielle de juré.'},
  'spain-public-judicial-notice':{title:'Avis public aux parties intéressées',classification:'Avis judiciaire publié',visualNote:'Avis public réel renvoyant les personnes intéressées vers un tribunal de Jaén dans les neuf jours suivant la publication. Le délai est expiré ; ce n’est pas une instruction actuelle.'},
  'india-supreme-court-fake-website-advisory':{title:'Avertissement de la Cour suprême sur de faux sites judiciaires',classification:'Alerte officielle à l’arnaque',visualNote:'Avis 2026 de la Cour suprême de l’Inde sur des sites imitant son site officiel. Il s’agit d’une recommandation officielle, pas d’un avis de dossier individuel.'},
  'brazil-parana-citation-notice':{title:'Avis public de citation avec délai de réponse',classification:'Avis judiciaire publié',visualNote:'Citation judiciaire réelle d’une page publiée en 2026. Le destinataire nommé peut répondre dans les 15 jours ouvrables après la période de publication ; cet exemple archivé n’est pas une instruction actuelle.'},
  'france-court-convocation-form':{title:'Formulaire de demande de rendez-vous au tribunal',classification:'Formulaire officiel vierge',visualNote:'Le tribunal de Paris demande aux candidats de constituer un dossier et d’envoyer ce formulaire de deux pages avec les pièces justificatives. Il s’agit d’une demande, pas d’une convocation.'},
  'feed-maryland-judiciary-news-e1dde7fcf':{title:'Arnaques par SMS sur des infractions routières au District Court of Maryland',classification:'Exemple d’arnaque confirmé',visualNote:'La justice du Maryland a publié cet exemple comme alerte à l’arnaque. L’original de l’autorité est présenté ci-dessus.'},
  'feed-maryland-judiciary-news-20f1e9df0':{title:'Arnaque par SMS sur le stationnement et les péages au tribunal de Baltimore City',classification:'Exemple d’arnaque confirmé',visualNote:'La justice du Maryland a publié cet exemple comme alerte à l’arnaque. L’original de l’autorité est présenté ci-dessus.'}
 },
 ko:{
  'dallas-traffic-qr-scam':{title:'QR 결제를 요구하는 교통 위반 미이행 통지',classification:'확인된 사기 사례',visualNote:'가짜 법원 서식, 사건 번호, 불이행 경고와 QR 코드 결제 경로가 결합된 통지입니다.'},
  'maryland-court-text-scam':{title:'가짜 심리와 결제 경로가 포함된 법원 사칭 문자',classification:'확인된 사기 사례',visualNote:'법원처럼 보이는 문자에 심리 안내, 결제 문구와 가짜 QR 코드가 함께 들어 있습니다.'},
  'connecticut-sample-jury-summons':{title:'연방 배심원 소환장 예시',classification:'정상 예시/양식',visualNote:'공식 배심원 소환장의 구조와 정보 밀도를 보여 주는 법원 공개 참고 문서입니다.'},
  'spain-public-judicial-notice':{title:'이해관계인을 위한 공개 사법 통지',classification:'공개된 사법 통지',visualNote:'공개 후 9일 안에 Jaén 법원에 출석할 수 있음을 알리는 실제 공고입니다. 해당 기간은 지났으며 현재 사용자에게 주어진 지시가 아닙니다.'},
  'india-supreme-court-fake-website-advisory':{title:'가짜 법원 웹사이트에 대한 인도 대법원 경고',classification:'공식 사기 경고',visualNote:'인도 대법원 공식 사이트를 사칭하는 가짜 웹사이트에 대한 2026년 공식 안내입니다. 개별 사건 통지가 아닙니다.'},
  'brazil-parana-citation-notice':{title:'응답 기간이 있는 공개 소환 공고',classification:'공개된 사법 통지',visualNote:'2026년에 공개된 실제 1페이지 법원 소환 공고입니다. 공고 기간 뒤 15영업일 안에 답변할 수 있다고 안내하며, 보관된 예시라 현재 사용자에게 주어진 지시는 아닙니다.'},
  'france-court-convocation-form':{title:'법원 일정 신청서',classification:'공식 빈 양식',visualNote:'파리 법원은 신청자가 서류를 준비해 증빙 자료와 함께 2페이지 양식을 제출하도록 안내합니다. 소환장이 아니라 신청서입니다.'},
  'feed-maryland-judiciary-news-e1dde7fcf':{title:'메릴랜드 지방법원 교통 위반 관련 문자 사기',classification:'확인된 사기 사례',visualNote:'Maryland Judiciary가 사기 경고로 공개한 사례입니다. 위에는 당국이 공개한 원본 자료가 표시됩니다.'},
  'feed-maryland-judiciary-news-20f1e9df0':{title:'Baltimore City 지방법원 주차·통행료 관련 문자 사기',classification:'확인된 사기 사례',visualNote:'Maryland Judiciary가 사기 경고로 공개한 사례입니다. 위에는 당국이 공개한 원본 자료가 표시됩니다.'}
 },
 tr:{
  'dallas-traffic-qr-scam':{title:'QR koduyla ödeme isteyen trafik temerrüt bildirimi',classification:'Doğrulanmış dolandırıcılık örneği',visualNote:'Sahte mahkeme anteti, dava numarası, temerrüt uyarısı ve QR kodlu ödeme yolu içeriyor.'},
  'maryland-court-text-scam':{title:'Sahte duruşma ve ödeme yolu içeren mahkeme mesajı',classification:'Doğrulanmış dolandırıcılık örneği',visualNote:'Mahkeme görünümündeki bir kısa mesaj, duruşma talimatını ödeme dili ve sahte bir QR koduyla birleştiriyor.'},
  'connecticut-sample-jury-summons':{title:'Federal jüri celbi örneği',classification:'Meşru örnek/form',visualNote:'Resmî bir jüri celbinin yapısını ve bilgi yoğunluğunu gösteren, mahkeme tarafından yayımlanmış referans belge.'},
  'spain-public-judicial-notice':{title:'İlgililere yönelik kamu ilanı',classification:'Yayımlanmış adli ilan',visualNote:'İlgilileri yayından sonraki dokuz gün içinde Jaén’deki bir mahkemeye yönlendiren gerçek bir kamu ilanı. Belirtilen süre dolmuştur; size yönelik güncel bir talimat değildir.'},
  'india-supreme-court-fake-website-advisory':{title:'Sahte mahkeme siteleri hakkında Yüksek Mahkeme uyarısı',classification:'Resmî dolandırıcılık uyarısı',visualNote:'Hindistan Yüksek Mahkemesinin resmî sitesini taklit eden sahte web siteleri hakkında 2026 tarihli resmî uyarı. Bireysel bir dava bildirimi değildir.'},
  'brazil-parana-citation-notice':{title:'Yanıt süresi içeren kamuya açık tebligat',classification:'Yayımlanmış adli ilan',visualNote:'2026’da yayımlanmış gerçek, tek sayfalık bir mahkeme tebligatı. Adı geçen kişinin ilan süresinden sonra 15 iş günü içinde yanıt verebileceğini belirtir; arşivlenmiş bu örnek size yönelik güncel bir talimat değildir.'},
  'france-court-convocation-form':{title:'Mahkeme randevusu başvuru formu',classification:'Resmî boş mahkeme formu',visualNote:'Paris mahkemesi başvuranlardan bir dosya hazırlayıp bu iki sayfalık formu destekleyici belgelerle göndermelerini ister. Bu bir başvurudur, celp değildir.'},
  'feed-maryland-judiciary-news-e1dde7fcf':{title:'Maryland Bölge Mahkemesi trafik ihlalleri hakkında SMS dolandırıcılığı',classification:'Doğrulanmış dolandırıcılık örneği',visualNote:'Maryland Judiciary bu örneği dolandırıcılık uyarısı olarak yayımladı. Yetkili kurumun orijinal görseli yukarıda gösteriliyor.'},
  'feed-maryland-judiciary-news-20f1e9df0':{title:'Baltimore City Bölge Mahkemesi otopark ve geçiş ücreti SMS dolandırıcılığı',classification:'Doğrulanmış dolandırıcılık örneği',visualNote:'Maryland Judiciary bu örneği dolandırıcılık uyarısı olarak yayımladı. Yetkili kurumun orijinal görseli yukarıda gösteriliyor.'}
 },
 hi:{
  'dallas-traffic-qr-scam':{title:'QR भुगतान वाला ट्रैफिक डिफ़ॉल्ट नोटिस',classification:'पुष्ट धोखाधड़ी उदाहरण',visualNote:'नकली अदालत लेटरहेड, मामला नंबर, डिफ़ॉल्ट चेतावनी और QR कोड भुगतान रास्ते वाला नोटिस।'},
  'maryland-court-text-scam':{title:'नकली सुनवाई और भुगतान रास्ते वाला अदालत संदेश',classification:'पुष्ट धोखाधड़ी उदाहरण',visualNote:'अदालत जैसा दिखने वाला टेक्स्ट संदेश सुनवाई के निर्देश को भुगतान भाषा और नकली QR कोड के साथ जोड़ता है।'},
  'connecticut-sample-jury-summons':{title:'संघीय जूरी समन का नमूना',classification:'वैध नमूना/फ़ॉर्म',visualNote:'आधिकारिक जूरी समन की बनावट और जानकारी की घनत्व दिखाने वाला अदालत द्वारा प्रकाशित संदर्भ दस्तावेज़।'},
  'spain-public-judicial-notice':{title:'हितधारकों के लिए सार्वजनिक न्यायिक नोटिस',classification:'प्रकाशित न्यायिक नोटिस',visualNote:'एक वास्तविक सार्वजनिक नोटिस जो प्रकाशन के नौ दिनों के भीतर इच्छुक पक्षों को Jaén की अदालत में भेजता है। बताई अवधि समाप्त हो चुकी है; यह आपके लिए वर्तमान निर्देश नहीं है।'},
  'india-supreme-court-fake-website-advisory':{title:'नकली अदालत वेबसाइटों पर सुप्रीम कोर्ट की चेतावनी',classification:'आधिकारिक धोखाधड़ी चेतावनी',visualNote:'भारत के सुप्रीम कोर्ट की 2026 की आधिकारिक सलाह, जो अदालत की वेबसाइट की नकल करने वाली नकली वेबसाइटों के बारे में है। यह किसी व्यक्तिगत मामले का नोटिस नहीं है।'},
  'brazil-parana-citation-notice':{title:'जवाब अवधि वाला सार्वजनिक समन नोटिस',classification:'प्रकाशित न्यायिक नोटिस',visualNote:'2026 में प्रकाशित वास्तविक एक-पृष्ठ अदालत समन। इसमें नामित व्यक्ति को नोटिस अवधि के बाद 15 कार्यदिवस में जवाब देने की अनुमति है; यह संग्रहित उदाहरण आपके लिए वर्तमान निर्देश नहीं है।'},
  'france-court-convocation-form':{title:'अदालत नियुक्ति आवेदन फ़ॉर्म',classification:'आधिकारिक खाली अदालत फ़ॉर्म',visualNote:'पेरिस अदालत आवेदकों से फ़ाइल तैयार करके यह दो-पृष्ठ फ़ॉर्म सहायक दस्तावेज़ों के साथ जमा करने को कहती है। यह आवेदन है, समन नहीं।'},
  'feed-maryland-judiciary-news-e1dde7fcf':{title:'Maryland जिला अदालत के ट्रैफिक उल्लंघनों पर टेक्स्ट घोटाले',classification:'पुष्ट धोखाधड़ी उदाहरण',visualNote:'Maryland Judiciary ने इस उदाहरण को धोखाधड़ी चेतावनी के रूप में प्रकाशित किया। ऊपर प्राधिकरण की मूल सामग्री दिखाई गई है।'},
  'feed-maryland-judiciary-news-20f1e9df0':{title:'Baltimore City जिला अदालत में पार्किंग और टोल उल्लंघनों पर टेक्स्ट घोटाला',classification:'पुष्ट धोखाधड़ी उदाहरण',visualNote:'Maryland Judiciary ने इस उदाहरण को धोखाधड़ी चेतावनी के रूप में प्रकाशित किया। ऊपर प्राधिकरण की मूल सामग्री दिखाई गई है।'}
 }
};

export function browseCaseCopy(item:BrowseCase,locale:DisplayLocale):CardCopy{
 const fallback={
  title:item.title,
  classification:item.classification,
  visualNote:item.visualNote
 };
 if(locale==='en')return fallback;
 return COPY[locale]?.[item.id]||fallback;
}

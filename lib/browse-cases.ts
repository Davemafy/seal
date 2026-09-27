export type BrowseCategory=
 |'jury-duty-payment-demand'
 |'fake-summons-arrest-threat'
 |'personal-information'
 |'court-payment-fee'
 |'legitimate-court-notice'
 |'ambiguous-unsupported';

export type BrowseSection='court-message-scams'|'jury-duty-threats'|'legitimate-reference';

export type BrowseCase={
 id:string;
 category:BrowseCategory;
 section:BrowseSection;
 featured?:boolean;
 title:string;
 language?:string;
 jurisdiction:string;
 issuer:string;
 sourceTitle:string;
 sourceUrl:string;
 classification:string;
 visualNote:string;
 excerpt:string;
 runText:string;
 preview:{type:'pdf'|'image'|'source';url:string;alt:string};
};

export const browseCases:BrowseCase[]=[
 {
  id:'brazil-judicial-notification-form',category:'legitimate-court-notice',section:'legitimate-reference',
  title:'Formulário de notificação judicial',language:'Português',jurisdiction:'Brasil · cooperação internacional',issuer:'Tribunal de Justiça de São Paulo',
  sourceTitle:'TJSP — Formulários A e B de carta rogatória',sourceUrl:'https://www.tjsp.jus.br/Download/Corregedoria/CartasRogatorias/Documentos/FormularioMexicoPanamaColombia.pdf',
  classification:'Official blank court form',visualNote:'Court-hosted Portuguese forms include a notice to the recipient and spaces for a response and hearing details. The fields are blank; this does not summon a named person.',
  excerpt:'Formulário B apresenta as informações essenciais para o destinatário de uma comunicação judicial.',runText:'',
  preview:{type:'pdf',url:'https://www.tjsp.jus.br/Download/Corregedoria/CartasRogatorias/Documentos/FormularioMexicoPanamaColombia.pdf',alt:'Portuguese judicial notification form hosted by the São Paulo court'}
 },
 {
  id:'nigeria-lagos-court-search',category:'legitimate-court-notice',section:'legitimate-reference',
  title:'High Court reference verification',language:'English',jurisdiction:'Lagos, Nigeria',issuer:'Lagos State Judiciary',
  sourceTitle:'Lagos State Judiciary — Verification, High Court',sourceUrl:'https://lagosjudiciary.gov.ng/search',
  classification:'Official verification portal',visualNote:'The judiciary provides a reference-number lookup. A result can help check the reference; it does not establish that a message or sender is genuine.',
  excerpt:'The Lagos State Judiciary publishes a High Court verification page with a reference-number search.',runText:'',
  preview:{type:'source',url:'https://lagosjudiciary.gov.ng/search',alt:'Lagos State Judiciary High Court reference verification'}
 },
 {
  id:'brazil-false-judicial-contact',category:'court-payment-fee',section:'court-message-scams',
  title:'Falso contato judicial e pedido de pagamento',language:'Português',jurisdiction:'Distrito Federal, Brasil',issuer:'TJDFT',
  sourceTitle:'TJDFT — Golpe do falso contato judicial',sourceUrl:'https://www.tjdft.jus.br/institucional/imprensa/noticias/2026/setembro/golpe-do-falso-contato-judicial-tjdft-alerta-para-nova-forma-de-fraude',
  classification:'Official court scam warning',visualNote:'The court warns about impersonators using real case details and urgent payment or transfer demands. This is an official warning, not a reproduced victim message.',
  excerpt:'O tribunal descreve contatos por WhatsApp, e-mail, chamada ou vídeo que pressionam por pagamentos ligados a processos.',runText:'',
  preview:{type:'source',url:'https://www.tjdft.jus.br/institucional/imprensa/noticias/2026/setembro/golpe-do-falso-contato-judicial-tjdft-alerta-para-nova-forma-de-fraude',alt:'TJDFT warning about false judicial contacts in Portuguese'}
 },
 {
  id:'spain-hearing-alerts',category:'legitimate-court-notice',section:'legitimate-reference',
  title:'Avisos de señalamientos judiciales',language:'Español',jurisdiction:'España',issuer:'Ministerio de Justicia',
  sourceTitle:'Sede Judicial Electrónica — avisos de señalamientos',sourceUrl:'https://sedewaf.justicia.es/web/guest/-/nuevas-funcionalidades-de-la-sede-judicial-electronica-del-territorio-ministerio',
  classification:'Official notification guidance',visualNote:'The ministry explains that participants can receive hearing alerts by SMS or email through the judicial portal in supported locations. A notification alone does not prove any individual case.',
  excerpt:'La sede judicial describe los avisos de señalamientos y la consulta de documentos en el área privada.',runText:'',
  preview:{type:'source',url:'https://sedewaf.justicia.es/web/guest/-/nuevas-funcionalidades-de-la-sede-judicial-electronica-del-territorio-ministerio',alt:'Spanish Ministry of Justice guidance on hearing alerts'}
 },
 {
  id:'france-court-reminders',category:'legitimate-court-notice',section:'legitimate-reference',
  title:'Rappels de convocation par SMS',language:'Français',jurisdiction:'France',issuer:'Ministère de la Justice',
  sourceTitle:'Justice.fr — fonctionnement de l’espace personnel',sourceUrl:'https://www.justice.fr/contact/espace-perso',
  classification:'Official notification guidance',visualNote:'The justice portal describes email updates and SMS reminders before a judicial appointment. This is service guidance, not a copy of a summons.',
  excerpt:'Le service explique les mises à jour des dossiers et les rappels automatiques avant un rendez-vous judiciaire.',runText:'',
  preview:{type:'source',url:'https://www.justice.fr/contact/espace-perso',alt:'French justice portal guidance on court appointment reminders'}
 },
 {
  id:'dallas-traffic-qr-scam',
  category:'court-payment-fee',
  section:'court-message-scams',
  featured:true,
  title:'Traffic default notice with QR payment',
  jurisdiction:'Dallas, Texas',
  issuer:'City of Dallas',
  sourceTitle:'City of Dallas — SCAM Notice',
  sourceUrl:'https://dallascityhall.com/departments/courtdetentionservices/DCH%20Documents/4-1-26%20-%20SCAM%20Notice.pdf',
  classification:'Confirmed scam example',
  visualNote:'Fake court letterhead, a case number, default warning, and a QR-code payment route.',
  excerpt:'A published scam notice threatens enforcement and directs the recipient to settle an unpaid balance through a QR code.',
  runText:'STATE OF TEXAS\nIN THE MUNICIPAL COURT OF THE CITY OF DALLAS, TEXAS\nTRAFFIC DIVISION\nCase No.: 26-TR-273196\nNOTICE OF DEFAULT — ENFORCEMENT ACTION INITIATED\nYou are hereby notified that IMMEDIATE ACTION IS REQUIRED to prevent further legal and administrative consequences:\nRemit full payment immediately of all outstanding fines, unpaid tolls, civil penalties, and court costs; OR\nAppear before the court at the scheduled hearing to address this matter, present defenses, and exercise your legal rights.\nScan the QR code to settle your unpaid balance.',
  preview:{type:'pdf',url:'https://dallascityhall.com/departments/courtdetentionservices/DCH%20Documents/4-1-26%20-%20SCAM%20Notice.pdf',alt:'City of Dallas published scam traffic-hearing notice with a QR payment code'}
 },
 {
  id:'maryland-court-text-scam',
  category:'fake-summons-arrest-threat',
  section:'court-message-scams',
  title:'Court text with a fake hearing and payment route',
  jurisdiction:'Maryland',
  issuer:'Maryland Judiciary',
  sourceTitle:'Maryland Judiciary — District Court text scam alert',
  sourceUrl:'https://www.mdcourts.gov/media/news/2026/pr20260306',
  classification:'Confirmed scam example',
  visualNote:'A court-looking text message combines a hearing instruction with payment language and a fictitious QR code.',
  excerpt:'Maryland Judiciary published the message as an example of a scam and warned recipients not to scan its QR code or provide payment.',
  runText:'NOTICE OF HEARING — PARKING VIOLATION. Appear for a hearing at the District Court in Baltimore City or resolve the matter by payment before the hearing date. Scan the QR code to pay.',
  preview:{type:'image',url:'https://www.mdcourts.gov/sites/default/files/import/media/news/images/textmessage030626.jpg',alt:'Maryland Judiciary published example of a scam court text message'}
 },
 {
  id:'mississippi-jury-payment-warning',
  category:'jury-duty-payment-demand',
  section:'jury-duty-threats',
  title:'Jury scam payment demand',
  jurisdiction:'Northern District of Mississippi',
  issuer:'U.S. District Court',
  sourceTitle:'Jury Scam Alert: Do Not Pay Callers Who Threaten to Arrest You Unless You Pay',
  sourceUrl:'https://www.msnd.uscourts.gov/sites/msnd/files/forms/Jury%20Scam%20Alert_0.pdf',
  classification:'Official court scam warning',
  visualNote:'Arrest pressure paired with an immediate request for money or gift-card details.',
  excerpt:'The court warns that jury scammers threaten arrest and demand payment by phone, sometimes asking for prepaid gift-card numbers.',
  runText:'You missed federal jury service. Avoid arrest by making an immediate payment over the phone or by providing a prepaid gift-card number.',
  preview:{type:'pdf',url:'https://www.msnd.uscourts.gov/sites/msnd/files/forms/Jury%20Scam%20Alert_0.pdf',alt:'Federal court jury scam alert about arrest threats and payment demands'}
 },
 {
  id:'nebraska-jury-phone-scam',
  category:'fake-summons-arrest-threat',
  section:'jury-duty-threats',
  title:'Jury phone scam warning',
  jurisdiction:'District of Nebraska',
  issuer:'U.S. District Court',
  sourceTitle:'WARNING – Jury Phone Scam',
  sourceUrl:'https://www.ned.uscourts.gov/internetDocs/jury/Warning-Jury_Phone_Scam.pdf',
  classification:'Official court scam warning',
  visualNote:'Impersonation of marshals or court officers, using real court details to make an arrest threat sound credible.',
  excerpt:'The District of Nebraska warns about callers claiming to be court or law-enforcement officials who seek money or financial information.',
  runText:'A caller claims to be a U.S. Marshal or court officer and says you must pay a fine to avoid arrest for failing to report for jury duty.',
  preview:{type:'pdf',url:'https://www.ned.uscourts.gov/internetDocs/jury/Warning-Jury_Phone_Scam.pdf',alt:'District of Nebraska jury phone scam warning PDF'}
 },
 {
  id:'north-carolina-fake-warrant-warning',
  category:'personal-information',
  section:'jury-duty-threats',
  title:'Fake warrant and settlement demand',
  jurisdiction:'Eastern District of North Carolina',
  issuer:'U.S. District Court',
  sourceTitle:'WARNING OF JURY SCAM',
  sourceUrl:'https://www.nced.uscourts.gov/pdfs/JuryScamNotice-04-11-2024.pdf',
  classification:'Official court scam warning',
  visualNote:'Fake warrants, settlement language, wire transfers, prepaid cards, and requests for sensitive account information.',
  excerpt:'The court warns about fake arrest warrants and demands to wire money, provide prepaid cards, or share bank and card information.',
  runText:'An email or caller claims an arrest warrant was issued for missed jury duty. To avoid arrest, call a settlement number, wire money, or provide a prepaid card.',
  preview:{type:'pdf',url:'https://www.nced.uscourts.gov/pdfs/JuryScamNotice-04-11-2024.pdf',alt:'Eastern District of North Carolina jury scam warning PDF'}
 },
 {
  id:'connecticut-sample-jury-summons',
  category:'legitimate-court-notice',
  section:'legitimate-reference',
  title:'Sample federal jury summons',
  jurisdiction:'District of Connecticut',
  issuer:'U.S. District Court',
  sourceTitle:'Sample Jury Summons Form',
  sourceUrl:'https://coop.ctd.uscourts.gov/sites/default/files/Sample%20Jury%20Summons%20Form.pdf',
  classification:'Legitimate sample/form',
  visualNote:'A court-published reference artifact for the structure and density of an official jury summons.',
  excerpt:'Official sample jury-summons form published on the District of Connecticut court domain.',
  runText:'UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT\n450 Main Street, Hartford, CT 06103\nJURY SUMMONS\nJuror No.: 02-0140\nREPORTING DATES: March 28(Tue.), May 3(Wed.) & May 4(Thu.), 2017\nPHONE TO CALL: Status Check Only: Call 1-866-388-2430 after 5:30 PM.',
  preview:{type:'pdf',url:'https://coop.ctd.uscourts.gov/sites/default/files/Sample%20Jury%20Summons%20Form.pdf',alt:'District of Connecticut official sample jury summons PDF'}
 }
];

export function getBrowseCase(id:string|undefined){return browseCases.find(item=>item.id===id)}

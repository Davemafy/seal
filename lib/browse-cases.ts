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
 ocrLanguage?:'eng'|'spa'|'por'|'fra';
 jurisdiction:string;
 issuer:string;
 sourceTitle:string;
 sourceUrl:string;
 classification:string;
 visualNote:string;
 excerpt:string;
 runText?:string;
 preview:{type:'pdf'|'image';url:string;alt:string};
};

export const browseCases:BrowseCase[]=[
 {
  id:'brazil-parana-citation-notice',category:'legitimate-court-notice',section:'legitimate-reference',
  title:'Public citation notice with response period',language:'Português',ocrLanguage:'por',jurisdiction:'Paraná, Brasil',issuer:'Tribunal de Justiça do Paraná',
  sourceTitle:'TJPR — Edital de citação (April 2026)',sourceUrl:'https://portal.tjpr.jus.br/pesquisa_athos/anexo/7156272',
  classification:'Published judicial notice',visualNote:'An actual one-page court citation published in 2026. It says the named recipient may file a response within 15 working days after the notice period; this archived example is not a current instruction to you.',
  excerpt:'O destinatário pode oferecer contestação em 15 dias úteis após o prazo do edital.',
  preview:{type:'pdf',url:'https://portal.tjpr.jus.br/pesquisa_athos/anexo/7156272',alt:'Paraná court published judicial citation PDF in Portuguese'}
 },
 {
  id:'spain-public-judicial-notice',category:'legitimate-court-notice',section:'legitimate-reference',
  title:'Public notice to interested parties',language:'Español',ocrLanguage:'spa',jurisdiction:'Jaén, España',issuer:'Boletín Oficial del Estado',
  sourceTitle:'BOE — Anuncio 24801 (21 July 2026)',sourceUrl:'https://www.boe.es/boe/dias/2026/07/21/pdfs/BOE-B-2026-24801.pdf',
  classification:'Published judicial notice',visualNote:'A real public notice referring interested parties to a Jaén court within nine days of publication. The stated period has passed; it is not a current instruction to you.',
  excerpt:'Los interesados podrán comparecer ante el Juzgado de lo Contencioso-Administrativo nº 1 de Jaén en el plazo indicado.',
  preview:{type:'pdf',url:'https://www.boe.es/boe/dias/2026/07/21/pdfs/BOE-B-2026-24801.pdf',alt:'Official Spanish judicial public notice PDF'}
 },
 {
  id:'france-court-convocation-form',category:'legitimate-court-notice',section:'legitimate-reference',
  title:'Court appointment application form',language:'Français',ocrLanguage:'fra',jurisdiction:'Paris, France',issuer:'Tribunal judiciaire de Paris',
  sourceTitle:'Tribunal judiciaire de Paris — Formulaire de demande de convocation',sourceUrl:'https://www.tribunal-de-paris.justice.fr/sites/default/files/2021-10/liste%2021-11%20al1%20version%20Octobre%202021.pdf',
  classification:'Official blank court form',visualNote:'The Paris court asks applicants to assemble a file and submit this two-page form with supporting documents. It is an application, not a summons.',
  excerpt:'Vous devez constituer un dossier par personne et adresser le formulaire au tribunal avec les pièces demandées.',
  preview:{type:'pdf',url:'https://www.tribunal-de-paris.justice.fr/sites/default/files/2021-10/liste%2021-11%20al1%20version%20Octobre%202021.pdf',alt:'Official Paris court application PDF in French'}
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

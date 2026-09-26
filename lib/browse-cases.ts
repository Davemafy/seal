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
 jurisdiction:string;
 issuer:string;
 sourceTitle:string;
 sourceUrl:string;
 classification:string;
 visualNote:string;
 excerpt:string;
 runText:string;
 preview:{type:'pdf'|'image';url:string;alt:string};
};

export const browseCases:BrowseCase[]=[
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
  runText:'UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT. JURY SUMMONS. Official sample form.',
  preview:{type:'pdf',url:'https://coop.ctd.uscourts.gov/sites/default/files/Sample%20Jury%20Summons%20Form.pdf',alt:'District of Connecticut official sample jury summons PDF'}
 }
];

export function getBrowseCase(id:string|undefined){return browseCases.find(item=>item.id===id)}

export type BrowseCategory=
 |'jury-duty-payment-demand'
 |'fake-summons-arrest-threat'
 |'personal-information'
 |'court-payment-fee'
 |'legitimate-court-notice'
 |'ambiguous-unsupported';

export type BrowseCase={
 id:string;
 category:BrowseCategory;
 categoryLabel:string;
 title:string;
 jurisdiction:string;
 issuer:string;
 sourceTitle:string;
 sourceUrl:string;
 classification:string;
 excerpt:string;
 runText:string;
 preview:{type:'pdf'|'image';url:string;alt:string};

};

export const browseCases:BrowseCase[]=[
 {
  id:'ftc-jury-payment-demand',
  category:'jury-duty-payment-demand',
  categoryLabel:'Jury duty payment demand',
  title:'Payment demand by phone',
  jurisdiction:'United States',
  issuer:'Federal Trade Commission',
  sourceTitle:'FTC — Jury duty scam warning',
  sourceUrl:'https://consumer.ftc.gov/consumer-alerts/2026/06/ignore-calls-texts-and-emails-threatening-arrest-you-missing-jury-duty',
  classification:'Official scam warning',
  excerpt:'Courts never demand payment over the phone. Only scammers say you can only pay with a payment app, cryptocurrency, gift cards, or a wire transfer service.',
  runText:'Courts never demand payment over the phone. Only scammers say you can only pay with a payment app, cryptocurrency, gift cards, or a wire transfer service.',
  preview:{type:'pdf',url:'https://www.msnd.uscourts.gov/sites/msnd/files/forms/Jury%20Scam%20Alert_0.pdf',alt:'Official U.S. District Court jury scam alert PDF about payment demands'}
 },
 {
  id:'riverside-arrest-threat',
  category:'fake-summons-arrest-threat',
  categoryLabel:'Fake summons / arrest threat',
  title:'Jury-duty arrest threat warning',
  jurisdiction:'Riverside County, California',
  issuer:'Superior Court of California, County of Riverside',
  sourceTitle:'Riverside Superior Court Warns Residents of Jury Duty Scam',
  sourceUrl:'https://www.riverside.courts.ca.gov/news/riverside-superior-court-warns-residents-jury-duty-scam',
  classification:'Court scam warning',
  excerpt:'Riverside Superior Court will not call or send text messages threatening residents with arrest or pressuring them to immediately report to a courthouse, provide personal or financial information, or make a payment.',
  runText:'Riverside Superior Court will not call or send text messages threatening residents with arrest or pressuring them to immediately report to a courthouse, provide personal or financial information, or make a payment. Contact Riverside Superior Court directly using official Court contact information to verify any questions regarding jury service.',
  preview:{type:'pdf',url:'https://www.ned.uscourts.gov/internetDocs/jury/Warning-Jury_Phone_Scam.pdf',alt:'Official U.S. District Court jury phone scam warning PDF'}
 },
 {
  id:'uscourts-personal-information',
  category:'personal-information',
  categoryLabel:'Request for personal information',
  title:'Juror personal-information request',
  jurisdiction:'United States federal courts',
  issuer:'Administrative Office of the U.S. Courts',
  sourceTitle:'U.S. Courts — Juror Scams',
  sourceUrl:'https://www.uscourts.gov/court-programs/jury-service/juror-scams',
  classification:'Official court guidance',
  excerpt:'Persons receiving such a telephone call or email should not provide the requested information and should immediately notify the Clerk of Court\'s office.',
  runText:'Persons receiving such a telephone call or email should not provide the requested information and should immediately notify the Clerk of Court\'s office.',
  preview:{type:'pdf',url:'https://www.nced.uscourts.gov/pdfs/JuryScamNotice-04-11-2024.pdf',alt:'Official U.S. District Court warning PDF about jury scams and requests for sensitive information'}
 },
 {
  id:'virginia-official-payment',
  category:'court-payment-fee',
  categoryLabel:'Court payment / fee message',
  title:'Official Virginia traffic-ticket payment route',
  jurisdiction:'Virginia',
  issuer:'Virginia Court System',
  sourceTitle:'Virginia Court System — Pay Traffic Tickets and Other Offenses',
  sourceUrl:'https://www.vacourts.gov/caseinfo/tickets_dc',
  classification:'Official payment guidance',
  excerpt:'Eligible cases display “Mark for Payment” in the official General District Court case system.',
  runText:'Eligible cases display “Mark for Payment” in the official General District Court case system.',
  preview:{type:'pdf',url:'https://dallascityhall.com/departments/courtdetentionservices/DCH%20Documents/4-2-26%20-%20SCAM%20Notice.pdf',alt:'City of Dallas published scam court notice PDF with payment QR code'}
 },
 {
  id:'riverside-jury-services',
  category:'legitimate-court-notice',
  categoryLabel:'Legitimate court notice',
  title:'Riverside Jury Services contact and portal',
  jurisdiction:'Riverside County, California',
  issuer:'Superior Court of California, County of Riverside',
  sourceTitle:'Riverside Jury Services',
  sourceUrl:'https://www.riverside.courts.ca.gov/divisions/jury-services',
  classification:'Official court service',
  excerpt:'If you have received a jury summons, access the juror web portal for confirmation of reporting time, date, and location instructions.',
  runText:'Superior Court of California County of Riverside. If you have received a jury summons, access the juror web portal for confirmation of reporting time, date, and location instructions. 951-275-5076 (phone) or 760-342-6264 (phone). Access the Juror Web Portal: jurywest.riverside.courts.ca.gov.',
  preview:{type:'pdf',url:'https://coop.ctd.uscourts.gov/sites/default/files/Sample%20Jury%20Summons%20Form.pdf',alt:'Official District of Connecticut sample jury summons PDF'}
 },
 {
  id:'ftc-fake-jury-website',
  category:'ambiguous-unsupported',
  categoryLabel:'Ambiguous / unsupported message',
  title:'Fake jury-duty website warning',
  jurisdiction:'United States',
  issuer:'Federal Trade Commission',
  sourceTitle:'FTC — Fake jury-duty websites',
  sourceUrl:'https://consumer.ftc.gov/consumer-alerts/2025/08/scammers-are-using-fake-websites-twist-jury-duty-scams',
  classification:'Official scam guidance',
  excerpt:'If you think the call could be real, don’t go to the URL they give you. Instead, look up the court’s real website for jury duty information.',
  runText:'If you think the call could be real, don’t go to the URL they give you. Instead, look up the court’s real website for jury duty information.',
  preview:{type:'image',url:'https://www.mdcourts.gov/sites/default/files/import/media/news/images/textmessage030626.jpg',alt:'Maryland Judiciary published image of a scam court text message'}
 }
];

export function getBrowseCase(id:string|undefined){return browseCases.find(item=>item.id===id)}

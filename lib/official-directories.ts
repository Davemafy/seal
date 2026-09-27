export type OfficialCourtDirectory={
 id:string;
 label:string;
 url:string;
 note:string;
 jurisdiction:string;
 countryCode:string;
 defaultLanguage:string;
};

const compact=(value:string)=>value.replace(/\s+/g,' ').trim();

const directories:Array<{match:(text:string)=>boolean;entry:OfficialCourtDirectory}>=[
 {
  match:text=>/\b(?:supreme court of india|e-?courts? india)\b/i.test(text)
   ||(/\b(?:district court|high court|sessions court|family court|magistrate court|supreme court)\b/i.test(text)
      &&/\b(?:india|new delhi|delhi|mumbai|bombay|kolkata|calcutta|chennai|madras|bengaluru|bangalore|karnataka|kerala|gujarat|rajasthan|punjab|haryana|uttar pradesh|madhya pradesh|telangana|andhra pradesh|odisha|orissa|patna|allahabad)\b/i.test(text)),
  entry:{
   id:'india-ecourts',
   jurisdiction:'India',countryCode:'IN',defaultLanguage:'en',
   label:'Search India eCourts',
   url:'https://services.ecourts.gov.in/ecourtindia_v6/',
   note:'Official eCourts Services can search case status by CNR number or other case details. Open it independently rather than using a link from the message.'
  }
 },
 {
  match:text=>/\b(?:tribunal judiciaire|cour d['’]appel|tribunal administratif)\b/i.test(text)
   &&/\b(?:france|paris|lyon|marseille|toulouse|bordeaux|lille|nice|nantes|strasbourg)\b/i.test(text),
  entry:{
   id:'france-justice-directory',
   jurisdiction:'France',countryCode:'FR',defaultLanguage:'fr',
   label:'Find the court on Justice.fr',
   url:'https://www.justice.fr/annuaires',
   note:'Justice.fr publishes the official directory of French courts. Use the directory to find contact details independently.'
  }
 },
 {
  match:text=>/\b(?:juzgado|audiencia provincial|tribunal superior de justicia)\b/i.test(text)
   &&/\b(?:españa|spain|madrid|barcelona|valencia|sevilla|seville|málaga|malaga|jaén|jaen)\b/i.test(text),
  entry:{
   id:'spain-cgpj-directory',
   jurisdiction:'Spain',countryCode:'ES',defaultLanguage:'es',
   label:'Find the court in the CGPJ directory',
   url:'https://www.poderjudicial.es/cgpj/es/Servicios/Directorio/ch.Directorio-de-Organos-Judiciales.formato3/',
   note:'Spain’s General Council of the Judiciary publishes a directory of judicial bodies with addresses and phone numbers.'
  }
 },
 {
  match:text=>/\b(?:tribunal de justiça|poder judiciário|vara judicial)\b/i.test(text)
   &&/\b(?:brasil|brazil|paraná|parana|são paulo|sao paulo|rio de janeiro|minas gerais|bahia)\b/i.test(text),
  entry:{
   id:'brazil-cnj-directory',
   jurisdiction:'Brazil',countryCode:'BR',defaultLanguage:'pt',
   label:'Find the court through Brazil’s CNJ',
   url:'https://www.cnj.jus.br/poder-judiciario/tribunais/',
   note:'Brazil’s National Council of Justice links to the country’s courts. Use that directory to reach the issuing court independently.'
  }
 },
 {
  match:text=>/\b(?:federal high court(?: of nigeria)?|nigeria federal high court)\b/i.test(text),
  entry:{
   id:'nigeria-fhc-divisions',
   jurisdiction:'Nigeria',countryCode:'NG',defaultLanguage:'en',
   label:'Find the Federal High Court division',
   url:'https://fhc.gov.ng/judicial-divisions/',
   note:'The Federal High Court of Nigeria publishes its judicial divisions and addresses. Use the official directory rather than contact details from the message.'
  }
 },
 {
  match:text=>/\b(?:high court of lagos state|lagos state judiciary)\b/i.test(text),
  entry:{
   id:'lagos-judiciary',
   jurisdiction:'Nigeria · Lagos State',countryCode:'NG',defaultLanguage:'en',
   label:'Open Lagos Judiciary',
   url:'https://jis.lagosjudiciary.gov.ng/ViewDirectories.aspx',
   note:'Lagos Judiciary publishes court and division contact details. Use those independently sourced details before responding.'
  }
 },
 {
  match:text=>/\b(?:united states district court|u\.?s\.? district court)\b/i.test(text),
  entry:{
   id:'us-federal-court-finder',
   jurisdiction:'United States · Federal',countryCode:'US',defaultLanguage:'en',
   label:'Find the court through U.S. Courts',
   url:'https://www.uscourts.gov/federal-court-finder/find',
   note:'The U.S. Courts directory can be used to find a federal court independently of any phone number or link in the message.'
  }
 }
];

export function officialCourtDirectoryFor(value:string):OfficialCourtDirectory|undefined{
 const text=compact(value);
 return directories.find(rule=>rule.match(text))?.entry;
}

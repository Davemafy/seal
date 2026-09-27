import {officialCourtDirectoryFor,type OfficialCourtDirectory} from './official-directories';

export type JourneyResource={label:string;url:string;note:string};
export type JusticeSupport={countryCode:string;jurisdiction:string;court:JourneyResource;caseLookup?:JourneyResource;legalAid?:JourneyResource;recovery?:JourneyResource};

const resource=(label:string,url:string,note:string):JourneyResource=>({label,url,note});

export function justiceSupportFor(text:string):JusticeSupport|undefined{
 const directory=officialCourtDirectoryFor(text);
 return directory?supportForDirectory(directory):undefined;
}

function supportForDirectory(directory:OfficialCourtDirectory):JusticeSupport{
 const court=resource(directory.label,directory.url,directory.note);
 const base={countryCode:directory.countryCode,jurisdiction:directory.jurisdiction,court};
 if(directory.countryCode==='IN')return {...base,
  caseLookup:resource('Search India eCourts','https://services.ecourts.gov.in/ecourtindia_v6/','Search the official eCourts service with a CNR number or other case details. A missing public result is not proof that a matter is false.'),
  legalAid:resource('Open NALSA legal aid','https://nalsa.gov.in/','Official National Legal Services Authority information and legal-aid access.'),
  recovery:resource('Open India cybercrime reporting','https://www.cybercrime.gov.in/','Official Government of India cybercrime reporting portal.')
 };
 if(directory.countryCode==='US')return {...base,
  legalAid:resource('Find civil legal aid','https://www.lsc.gov/about-lsc/what-legal-aid/i-need-legal-help','Legal Services Corporation directory for civil legal-aid providers.'),
  recovery:resource('Start identity-theft recovery','https://www.identitytheft.gov/','Official U.S. government identity-theft recovery service.')
 };
 if(directory.countryCode==='FR')return {...base,legalAid:resource('Check French legal aid','https://www.justice.fr/simulateurs/aide-juridictionnelle','Official Justice.fr information for aide juridictionnelle.')};
 if(directory.countryCode==='ES')return {...base,legalAid:resource('Check Spanish legal aid','https://sede.mjusticia.gob.es/es/tramites/asistencia-juridica-gratuita','Official Ministry of Justice information for free legal assistance.')};
 if(directory.countryCode==='BR')return {...base,legalAid:resource('Find public-defender information','https://www.cnj.jus.br/poder-judiciario/defensoria-publica/','Brazil National Council of Justice information about the Defensoria Pública.')};
 if(directory.countryCode==='NG')return {...base,legalAid:resource('Open Legal Aid Council of Nigeria','https://legalaidcouncil.gov.ng/','Official Legal Aid Council of Nigeria service information.')};
 return base;
}

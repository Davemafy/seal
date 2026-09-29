import {describe,it,expect} from 'vitest';
import en from '../lib/locales/en.json';
import fr from '../lib/locales/fr.json';
import ko from '../lib/locales/ko.json';
import tr from '../lib/locales/tr.json';
import hi from '../lib/locales/hi.json';

const locales={fr,ko,tr,hi};
const landingRequired=Object.keys(en).filter(key=>key.startsWith('landing')) as Array<keyof typeof en>;
const required=[
 'realExamples','seeRealCourtMessages','browseDeck','browseScope','filterSourceDocuments',
 'originalCourtMaterial','featuredSource','originalSourceAttached','checkInSeal',
 'whyResult','messageInstructions','underlyingMatter','independentToolNote',
 'independentEvidence','whatToDoNext','officialProcess','officialDirectory',
 'sourceConflict','knownPattern','officialWarning','sources','evidenceRecord',
 'nextHelpCopy','courtClaimed','caseReference','whatMessageAsks','explainNotice',
 'decisionActTitle','decisionGuidanceSummary','statusUnconfirmedNotice',
 'caseNoIdentifierTitle','caseNoIdentifierDetail','caseUnconfirmedTitle','caseUnconfirmedDetail',
 'courtMessageShort','openOfficialCourtService','openServiceNote',
 ...landingRequired
] as const;

describe('supported display locale coverage',()=>{
 for(const [locale,copy] of Object.entries(locales)){
  it(`${locale} has localized primary result and Browse copy`,()=>{
   for(const key of required){
    expect(copy[key],`${locale} missing ${key}`).toBeTruthy();
    expect(copy[key],`${locale} fell back to English for ${key}`).not.toBe(en[key]);
   }
  });
 }
});

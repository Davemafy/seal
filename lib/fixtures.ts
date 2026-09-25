export const fixtures={
 'action-message-demo':{title:'Connecticut / suspicious message',text:`DEMO / SYNTHETIC MESSAGE
Claimed sender: UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT
You failed to appear for federal jury duty.
TEXT MESSAGE: To avoid arrest, pay $750 today using Cash App.
Call 203-555-0199 immediately for payment instructions.
TEXT MESSAGE: Reply with your Social Security number and date of birth to clear the warrant.
This synthetic example is based on published jury-scam patterns. It is not a real person's message.`},
 'riverside-mismatch-demo':{title:'Riverside / mixed evidence',text:`DEMO / FICTIONAL NOTICE
SUPERIOR COURT OF CALIFORNIA, COUNTY OF RIVERSIDE
Riverside Historic Courthouse, 4050 Main Street, Riverside, CA 92501
Juror number: 10472893
Reporting date: April 22, 2027
Jury Services contact: (866) 555-0199
Official jury portal: rcvduty.com
Email: jurysupport@riverside-court.org
SMS message from Jury Services: Pay $50 via payment app to confirm your attendance.
Failure to appear may result in legal consequences.`},
 'riverside-consistent-demo':{title:'Riverside / consistent facts',text:`DEMO / FICTIONAL NOTICE
SUPERIOR COURT OF CALIFORNIA, COUNTY OF RIVERSIDE
Riverside Historic Courthouse, 4050 Main Street, Riverside, CA 92501
Juror number: 10472893
Reporting date: April 22, 2027
Jury Services contact: 951-275-5076
Official jury portal: jurywest.riverside.courts.ca.gov`},
 'unsupported-court-demo':{title:'Unsupported / limits',text:`DEMO / FICTIONAL NOTICE
High Court of Northbridge, Republic of Alder
12 Cedar Street, Northbridge
Reference number: ABC98233
Reporting date: April 22, 2027
Jury Services contact: (866) 555-0199`}
} as const;
export type FixtureKey=keyof typeof fixtures;

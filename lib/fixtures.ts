export const fixtures={
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

import type {Metadata} from 'next';
import {Instrument_Sans,Source_Serif_4} from 'next/font/google';
import './globals.css';

const instrument=Instrument_Sans({subsets:['latin'],variable:'--font-ui',display:'swap'});
const sourceSerif=Source_Serif_4({subsets:['latin'],variable:'--font-source',display:'swap'});

export const metadata:Metadata={
 title:'SEAL — The seal can be faked. The source can’t.',
 description:'Check claims on a court notice against independent official sources.'
};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body className={`${instrument.variable} ${sourceSerif.variable}`}>{children}</body></html>;
}

import type {Metadata} from 'next';import './globals.css';
export const metadata:Metadata={title:'SEAL — The seal can be faked. The source can’t.',description:'Check claims on a court notice against independent official sources.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}

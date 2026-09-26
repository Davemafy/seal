import type {Metadata} from 'next';
import localFont from 'next/font/local';
import './globals.css';

const uberMove=localFont({
 src:[
  {path:'./fonts/UberMoveMedium.otf',weight:'500',style:'normal'},
  {path:'./fonts/UberMoveBold.otf',weight:'700',style:'normal'}
 ],
 variable:'--font-uber-move',
 display:'swap'
});

export const metadata:Metadata={
 title:'SEAL — The seal can be faked. The source can’t.',
 description:'Check claims on a court notice against independent official sources.',
 icons:{
  icon:'/icon.svg',
  shortcut:'/icon.svg'
 }
};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body className={uberMove.variable}>{children}</body></html>;
}

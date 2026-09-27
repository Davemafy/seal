import type {Metadata,Viewport} from 'next';
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

const productDescription='Check court messages against public sources before you act. See what is confirmed, what is not, and where the evidence came from.';

export const metadata:Metadata={
 title:{
  default:'SEAL',
  template:'%s | SEAL'
 },
 description:productDescription,
 applicationName:'SEAL',
 manifest:'/manifest.webmanifest',
 icons:{
  icon:[
   {url:'/favicon-seal-v3.svg',type:'image/svg+xml'}
  ],
  shortcut:'/favicon-seal-v3.svg',
  apple:'/favicon-seal-v3.svg'
 },
 openGraph:{
  title:'SEAL',
  description:productDescription,
  siteName:'SEAL',
  type:'website'
 },
 twitter:{
  card:'summary',
  title:'SEAL',
  description:productDescription
 },
 formatDetection:{
  telephone:false,
  email:false,
  address:false
 }
};

export const viewport:Viewport={
 themeColor:'#ffffff',
 colorScheme:'light'
};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body className={uberMove.variable}>{children}</body></html>;
}

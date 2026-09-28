import type {Metadata,Viewport} from 'next';
import localFont from 'next/font/local';
import './globals.css';
import SiteLoader from './site-loader';
import PwaRegister from './pwa-register';

const uberMove=localFont({
 src:[
  {path:'./fonts/UberMoveMedium.otf',weight:'500',style:'normal'},
  {path:'./fonts/UberMoveBold.otf',weight:'700',style:'normal'}
 ],
 variable:'--font-uber-move',
 display:'swap'
});

const productDescription='Before you call, click, pay, or reply: check what a court message asks you to do against independent public sources.';

export const metadata:Metadata={
 metadataBase:new URL('https://seal.imafidondavid1.workers.dev'),
 title:{
  default:'SEAL',
  template:'%s | SEAL'
 },
 description:productDescription,
 applicationName:'SEAL',
 manifest:'/manifest.webmanifest',
 icons:{
  icon:[
   {url:'/brand/seal-app-icon-dark.svg',type:'image/svg+xml'}
  ],
  shortcut:'/brand/seal-app-icon-dark.svg',
  apple:'/brand/seal-app-icon-dark.svg'
 },
 appleWebApp:{
  capable:true,
  title:'SEAL',
  statusBarStyle:'default'
 },
 openGraph:{
  title:'SEAL — The seal can be faked. The source can’t.',
  description:productDescription,
  siteName:'SEAL',
  type:'website'
 },
 twitter:{
  card:'summary_large_image',
  title:'SEAL — The seal can be faked. The source can’t.',
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
 return <html lang="en"><body className={uberMove.variable}><PwaRegister/><SiteLoader/>{children}</body></html>;
}

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
 title:{
  default:'Seal',
  template:'%s · Seal'
 },
 description:'Check court messages against independent public sources before you act.',
 applicationName:'Seal',
 icons:{
  icon:{url:'/favicon-seal-v2.svg',type:'image/svg+xml'},
  shortcut:'/favicon-seal-v2.svg'
 }
};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body className={uberMove.variable}>{children}</body></html>;
}

import type {MetadataRoute} from 'next';

export default function manifest():MetadataRoute.Manifest{
 return {
  name:'SEAL',
  short_name:'SEAL',
  description:'Check court messages against public sources before you act.',
  start_url:'/',
  scope:'/',
  display:'standalone',
  background_color:'#f8f7f2',
  theme_color:'#ffffff',
  orientation:'any',
  categories:['utilities','productivity'],
  icons:[
   {
    src:'/brand/seal-app-icon-dark.svg',
    sizes:'any',
    type:'image/svg+xml',
    purpose:'any'
   },
   {
    src:'/brand/seal-app-icon-maskable.svg',
    sizes:'any',
    type:'image/svg+xml',
    purpose:'maskable'
   }
  ],
  shortcuts:[
   {
    name:'Check a message',
    short_name:'Check',
    description:'Check a court message against independent public sources.',
    url:'/check/primary'
   },
   {
    name:'Browse real examples',
    short_name:'Browse',
    description:'Browse source-backed court-message examples.',
    url:'/browse'
   }
  ]
 };
}

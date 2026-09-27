import type {MetadataRoute} from 'next';

export default function manifest():MetadataRoute.Manifest{
 return {
  name:'SEAL',
  short_name:'SEAL',
  description:'Check court messages against public sources before you act.',
  start_url:'/',
  scope:'/',
  display:'standalone',
  background_color:'#ffffff',
  theme_color:'#ffffff',
  orientation:'any',
  categories:['utilities','productivity'],
  icons:[
   {
    src:'/favicon-seal-v3.svg',
    sizes:'any',
    type:'image/svg+xml',
    purpose:'any'
   }
  ]
 };
}

import {copyFileSync,cpSync,mkdirSync} from 'node:fs';
mkdirSync('public',{recursive:true});
copyFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/pdf.worker.min.mjs');
cpSync('node_modules/pdfjs-dist/standard_fonts','public/standard_fonts',{recursive:true});

const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
for(const file of ['index.html','beauty.css','core.js','app2.js','smart-bag.js','gallery.js','smart-ui.js','vendor/ocr/tesseract.min.js','app.js','pwa.js','ydsync.js','tgbk.js','manifest.webmanifest','moonlight-decor.svg','icon-192.png','icon-512.png','apple-touch-icon.png']){
 if(!fs.existsSync(file))throw Error('Missing PWA asset: '+file);
 if(file.endsWith('.js')&&!html.includes('src="'+file+'"')&&file!=='sw.js')throw Error('Missing script tag: '+file);
 if(!sw.includes("'"+file+"'"))throw Error('Missing offline cache entry: '+file);
}
for(const file of ['vendor/ocr/worker.min.js','vendor/ocr/core/tesseract-core.wasm','vendor/ocr/lang/eng.traineddata.gz','vendor/ocr/lang/rus.traineddata.gz'])if(!fs.existsSync(file))throw Error('Missing local OCR asset: '+file);
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
if(manifest.display!=='standalone'||manifest.start_url!=='./'||manifest.scope!=='./'||manifest.theme_color!=='#12101D')throw Error('Invalid GitHub Pages PWA manifest');
if(!manifest.icons.some(icon=>icon.sizes==='192x192')||!manifest.icons.some(icon=>icon.sizes==='512x512'))throw Error('Missing PWA icons');
for(const tag of ['apple-touch-icon','apple-mobile-web-app-capable','apple-mobile-web-app-title','apple-mobile-web-app-status-bar-style','viewport-fit=cover'])if(!html.includes(tag))throw Error('Missing iPhone installation metadata: '+tag);
console.log('Build and PWA assets OK');

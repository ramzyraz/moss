const fs = require('node:fs');
fs.mkdirSync('dist/browser/renderer', {recursive:true});
for (const name of ['index.html','style.css']) fs.copyFileSync(`src/renderer/${name}`,`dist/browser/renderer/${name}`);
fs.cpSync('assets','dist/browser/assets',{recursive:true});

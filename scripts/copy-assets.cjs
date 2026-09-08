const fs = require('node:fs');
fs.mkdirSync('dist/renderer', {recursive:true});
for (const name of ['index.html','style.css']) fs.copyFileSync(`src/renderer/${name}`,`dist/renderer/${name}`);
fs.cpSync('assets','dist/assets',{recursive:true});

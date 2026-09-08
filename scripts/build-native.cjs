const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
if(process.platform!=='darwin')process.exit(0);
const prefix=path.resolve(path.dirname(fs.realpathSync(process.execPath)),'..');
const include=process.env.NODE_INCLUDE_DIR || path.join(prefix,'include','node');
if(!fs.existsSync(path.join(include,'node_api.h')))throw new Error('Node-API headers are missing. Set NODE_INCLUDE_DIR to the directory containing node_api.h.');
fs.mkdirSync('dist/native',{recursive:true});
execFileSync('xcrun',['clang++','-std=c++17','-bundle','-undefined','dynamic_lookup','-fobjc-arc','-mmacosx-version-min=12.0','-DNAPI_VERSION=8','-DNODE_GYP_MODULE_NAME=moss_overlay','-I',include,'-framework','AppKit','native/overlay.mm','-o','dist/native/overlay.node'],{stdio:'inherit'});

// Original geometric leaf mark, generated locally. No external assets or libraries.
const fs=require('node:fs'),zlib=require('node:zlib');
const N=1024,raw=Buffer.alloc((N*4+1)*N);
for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=y*(N*4+1)+1+x*4;
  const dx=Math.max(110-x,0,x-914),dy=Math.max(110-y,0,y-914);
  if(dx*dx+dy*dy>10000)continue;
  let c=[27,46,34,255];
  const u=(x-516)*.82+(y-482)*.57,v=-(x-516)*.57+(y-482)*.82;
  if((u/205)**2+(v/295)**2<1&&x+y>560)c=[196,227,152,255];
  const stemX=720-y*.43;
  if(y>320&&y<790&&Math.abs(x-stemX)<13)c=y<710?[48,75,43,255]:[196,227,152,255];
  for(let k=0;k<4;k++)raw[i+k]=c[k];
}
function crc32(b){let c=0xffffffff;for(const v of b){c^=v;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),n=Buffer.alloc(4),crc=Buffer.alloc(4);n.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([n,t,data,crc]);}
const header=Buffer.alloc(13);header.writeUInt32BE(N,0);header.writeUInt32BE(N,4);header[8]=8;header[9]=6;
fs.writeFileSync('assets/moss-icon.png',Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

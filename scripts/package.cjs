const {version}=require('../package.json');
(async()=>{
 const {packager}=await import('@electron/packager');
 const windows=process.argv.includes('--windows');
 const platform=windows?'win32':'darwin';
 if(process.platform!==platform)throw new Error(`Package ${platform} on a ${platform} host so native binaries and icons match.`);
 const result=await packager({dir:'.',name:'Moss',platform,arch:windows?'x64':'arm64',out:`release/${version}`,overwrite:true,prune:true,
  ignore:/^\/(release|recordings|tests|src|scripts|native|artifacts|\.git|\.github)(\/|$)/,
  icon:windows?'assets/moss.ico':'assets/moss.icns',asar:{unpack:'**/*.node'},
  ...(windows?{win32metadata:{CompanyName:'Moss',FileDescription:'Moss focus companion',ProductName:'Moss'}}:{appBundleId:'dev.moss.focus',appCategoryType:'public.app-category.productivity'})});
 console.log(result.join('\n'));
})().catch(error=>{console.error(error);process.exit(1)});

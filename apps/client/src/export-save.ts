import {Capacitor} from '@capacitor/core';
import type {SaveData} from '@eldoria/domain';
/** Browser download or Android's system share sheet, without public storage permissions. */
export async function exportSave(data:SaveData):Promise<void>{
  const json=JSON.stringify(data,null,2);
  if(Capacitor.isNativePlatform()){
    const [{Filesystem,Directory,Encoding},{Share}]=await Promise.all([import('@capacitor/filesystem'),import('@capacitor/share')]);
    const file=await Filesystem.writeFile({path:'eldoria-offline.json',data:json,directory:Directory.Cache,encoding:Encoding.UTF8});
    await Share.share({title:'Zapis Eldorii',url:file.uri,dialogTitle:'Zapisz lub udostępnij przygodę'});
    return;
  }
  const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='eldoria-offline.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

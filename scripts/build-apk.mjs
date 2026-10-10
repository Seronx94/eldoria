import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
const sdk=process.env.ANDROID_HOME??process.env.ANDROID_SDK_ROOT;
if(!sdk||!existsSync(sdk)){
 console.error('Brak Android SDK. Zainstaluj Android Studio i ustaw ANDROID_HOME na folder SDK. Instrukcja: docs/ANDROID.md.');process.exit(1);
}
const java=spawnSync('java',['-version'],{encoding:'utf8'});
const version=(java.stderr??'')+(java.stdout??'');
if(java.error||Number(version.match(/version "(\d+)/)?.[1]??0)<21){console.error('Do Androida wymagany JDK 21 lub nowszy. Użyj JDK z Android Studio; zobacz docs/ANDROID.md.');process.exit(1);}
const windows=process.platform==='win32';
const result=spawnSync(windows?'cmd.exe':'sh',windows?['/d','/s','/c','gradlew.bat assembleDebug']:['./gradlew','assembleDebug'],{cwd:resolve(root,'android'),stdio:'inherit'});
if(result.error){console.error(`Nie można uruchomić Gradle: ${result.error.message}`);process.exit(1);}
if(result.status!==0)process.exit(result.status??1);
const apk=resolve(root,'android/app/build/outputs/apk/debug/app-debug.apk');
if(!existsSync(apk)){console.error('Gradle zakończył się bez oczekiwanego APK.');process.exit(1);}
console.log(`APK testowe: ${apk}`);

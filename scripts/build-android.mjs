import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const task = process.argv[2];
if (!['assembleDebug', 'bundleRelease'].includes(task)) throw new Error('Unsupported build task');
const env = { ...process.env };
const studioJava = '/Applications/Android Studio.app/Contents/jbr/Contents/Home';
if (process.platform === 'darwin' && existsSync(studioJava)) env.JAVA_HOME = studioJava;
const sdk = process.platform === 'darwin' ? `${homedir()}/Library/Android/sdk` : `${homedir()}/Android/Sdk`;
if (!env.ANDROID_HOME && existsSync(sdk)) env.ANDROID_HOME = sdk;
const result = spawnSync(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', [task, '--console=plain'], {
  cwd: fileURLToPath(new URL('../android/', import.meta.url)), env, stdio: 'inherit', shell: process.platform === 'win32'
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);

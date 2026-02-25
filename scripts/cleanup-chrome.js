import { execSync } from 'child_process';
import os from 'os';

console.log('🧹 Procurando processos Chrome órfãos do WhatsApp...');

try {
    if (os.platform() === 'win32') {
        // Find chrome.exe processes located inside the .cache/puppeteer folder
        // and kill them using WMIC to avoid killing the user's main Chrome browser
        execSync('WMIC PROCESS WHERE "Name=\'chrome.exe\' AND ExecutablePath LIKE \'%puppeteer%\'" CALL Terminate', { stdio: 'ignore' });
        console.log('✅ Processos órfãos removidos com sucesso.');
    } else {
        // macOS/Linux approach
        execSync('pkill -f "chrome.*--headless"', { stdio: 'ignore' });
        console.log('✅ Processos órfãos removidos com sucesso.');
    }
} catch (error) {
    // If wmic fails or no process is found, it throws an error. We can safely ignore it.
    console.log('Nenhum processo headless travado foi encontrado.');
}

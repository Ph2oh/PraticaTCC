import { execSync } from 'child_process';
import os from 'os';

console.log(' Procurando processos Chrome órfãos do WhatsApp...');

try {
    if (os.platform() === 'win32') {
        // WMIC é removido em versões recentes do Windows.
        // Primeiro tenta via CIM/PowerShell filtrando apenas processos usados por automação.
        const psKillOrphans = [
            "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\"",
            "Where-Object { $_.CommandLine -match 'puppeteer|wwebjs_auth|whatsapp-web.js' }",
            "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
        ].join(' | ');

        execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psKillOrphans}"`, { stdio: 'ignore' });
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

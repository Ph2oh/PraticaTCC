import { execSync } from 'child_process';
import os from 'os';

console.log(' Procurando processos Chrome órfãos do WhatsApp...');

try {
    if (os.platform() === 'win32') {
        // Usar WMI para buscar processos chrome em headless, comum ao puppeteer
        const psKillOrphans = "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'chrome.exe' -and $_.CommandLine -match '--headless' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";

        execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psKillOrphans}"`, { stdio: 'ignore' });
        console.log(' Processos órfãos removidos com sucesso.');
    } else {
        // macOS/Linux approach
        execSync('pkill -f "chrome.*--headless"', { stdio: 'ignore' });
        console.log(' Processos órfãos removidos com sucesso.');
    }
} catch (error) {
    // If wmic fails or no process is found, it throws an error. We can safely ignore it.
    console.log('Nenhum processo headless travado foi encontrado.');
}

const { spawn } = require('child_process');
const text = 'বাংলা ';
const encodedText = Buffer.from(text, 'utf16le').toString('base64');
const script = [
    'Add-Type -AssemblyName System.Windows.Forms;',
    '$text = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($args[0]));',
    'Set-Clipboard -Value $text;',
    'Start-Sleep -Milliseconds 90;',
    '[System.Windows.Forms.SendKeys]::SendWait("^v");'
].join(' ');

console.log('Script:', script);
console.log('Encoded text:', encodedText);

const child = spawn('powershell.exe', ['-NoProfile', '-Sta', '-ExecutionPolicy', 'Bypass', '-Command', script, encodedText], { stdio: 'inherit' });
child.on('exit', code => console.log('Exit:', code));

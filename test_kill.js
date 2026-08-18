const { exec } = require('child_process');
exec('for /f "tokens=5" %a in (\'netstat -aon ^| find "LISTENING" ^| find ":8000"\') do echo %a', (err, stdout, stderr) => {
    console.log('STDOUT:', stdout);
    console.log('ERR:', err);
    console.log('STDERR:', stderr);
});

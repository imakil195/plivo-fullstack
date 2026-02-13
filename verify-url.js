const http = require('http');

http.get('http://localhost:3001/api/public/apple/status', (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    res.on('data', (d) => process.stdout.write(d));
}).on('error', (e) => {
    console.error(e);
});

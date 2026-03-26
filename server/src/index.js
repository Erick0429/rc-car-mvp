import http from 'node:http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, service: 'rc-car-mvp-server' }));
});

server.listen(8787, () => {
  console.log('server listening on http://localhost:8787');
});

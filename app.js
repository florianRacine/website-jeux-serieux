const http = require('http');
const express = require('express');
const app = express();

const server = http.createServer(app);
const io = require('./ioServers/theGuardians');
io(server);

server.listen(3000, () => {
  console.log('Le serveur est en cours d\'exécution sur le port 3000');
});

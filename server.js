'use strict';

const logger = require('./helper/logger')(module);
const express = require('express');
const app = express();
const https = require('https');
const http = require('http');
const fs = require('fs');
const config = require('./config');
const errorHandlers = require('./helper/errors');
const routes = require('./routes');
const socketRoutes = require('./socketRoutes');

let server = http.createServer(app);

// if (config.isLocal()) {
//   server = https.createServer({
//     key: fs.readFileSync('./ssl/server.key'),
//     cert: fs.readFileSync('./ssl/server.cert'),
//     requestCert: false,
//     rejectUnauthorized: false
//   }, app);
//   process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
// } else {
//   server = http.createServer(app);
// }

errorHandlers.handleUncaughtExceptions();
errorHandlers.handleKillSignals();

let params = {
  cors: {
    origin: '*' // it should be restricted
  },
  // pingInterval: 4000,
  // pingTimeout: 8000
};

const io = require('socket.io')(server, params);

const port = process.env.PORT || config.get('server:port');
//web app
logger.info('Starting Express Web Server on Port ' + port);

app.use(express.static('views'))

routes(app);
socketRoutes(io);

app.use(errorHandlers.gracefulShutdownMiddleware(app));
app.use(errorHandlers.notFoundHandler);
app.use(errorHandlers.appErrorHandler);

server.listen(port, async () => {
  errorHandlers.setServer(server);
});

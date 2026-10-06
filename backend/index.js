// Ponto de entrada das Cloud Functions: publica o app Express como a função "api".
// O Firebase Hosting encaminha /api/** para ela (firebase.json).
const { setGlobalOptions } = require('firebase-functions');
const { onRequest } = require('firebase-functions/https');
const app = require('./src/app');

setGlobalOptions({ region: 'southamerica-east1', maxInstances: 10 });

exports.api = onRequest({ memory: '256MiB', timeoutSeconds: 60 }, app);

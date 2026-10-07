// Os testes rodam num emulador próprio (portas 8180 e 9199, firebase.testes.json),
// separado do emulador de desenvolvimento: nunca apagam o que foi cadastrado na tela.
process.env.GCLOUD_PROJECT = 'demo-ferrum-testes';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8180';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9199';
process.env.PAINEL_CACHE_MS = '0';

// Os testes usam um projeto próprio no emulador, separado dos dados de
// desenvolvimento: limpar o banco aqui nunca apaga o que foi cadastrado na tela.
process.env.GCLOUD_PROJECT = 'demo-ferrum-testes';
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
process.env.LOGIN_DESATIVADO = 'true';

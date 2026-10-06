// O firebase-admin carrega jwks-rsa (que depende do pacote ESM "jose") só para
// App Check e chaves JWKS, que o Ferrum não usa. O Jest não carrega esse ESM,
// então nos testes ele é substituído por este módulo vazio.
module.exports = function jwksRsa() {
  throw new Error('jwks-rsa não está disponível nos testes');
};

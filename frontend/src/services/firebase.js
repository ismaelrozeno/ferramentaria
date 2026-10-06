import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth'

// Configuração pública do app web (identifica o projeto; não é senha).
// O navegador usa o Firebase só para o login: os dados passam sempre pela API.
const app = initializeApp({
  apiKey: 'AIzaSyDE6SMkZ_jAswQKGdEXGQVXd9foWisA2b4',
  authDomain: 'ferramentaria-68f52.firebaseapp.com',
  projectId: 'ferramentaria-68f52',
  appId: '1:939318568928:web:e591757147d537d323ed85',
})

// O login fica salvo no navegador: a pessoa continua logada depois de fechar
// a aba ou reiniciar o computador, até clicar em "Sair".
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
})
auth.languageCode = 'pt-BR'

// No computador de desenvolvimento, o login usa o emulador (contas de teste).
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
}

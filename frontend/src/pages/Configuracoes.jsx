import { sendPasswordResetEmail } from 'firebase/auth'
import { useState } from 'react'
import { useAparencia } from '../contexto/aparencia.js'
import { useAuth } from '../contexto/auth.js'
import SecaoLixeira from '../components/SecaoLixeira.jsx'
import { auth } from '../services/firebase.js'
import { ACENTOS, FUNDOS, ICONES, MENUS, TEMAS } from '../utils/aparencia.js'

function Opcoes({ legenda, nome, valor, opcoes, aoEscolher }) {
  return (
    <fieldset className="escolha-tipo">
      <legend>{legenda}</legend>
      {opcoes.map((opcao) => (
        <label key={opcao.id} className="opcao">
          <input type="radio" name={nome} value={opcao.id} checked={valor === opcao.id} onChange={() => aoEscolher(opcao.id)} />
          <span>
            <strong>
              {opcao.cor && <i className="amostra" style={{ background: opcao.cor }} aria-hidden="true" />}
              {opcao.nome}
            </strong>
            {opcao.texto}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

function Configuracoes() {
  const { usuario, ehAdmin } = useAuth()
  const { prefs, temaResolvido, erro, alterar } = useAparencia()
  const [envio, setEnvio] = useState({ estado: 'parado', mensagem: '' })

  const fundos = FUNDOS[temaResolvido]
  const fundoAtual = fundos.some((f) => f.id === prefs.fundo) ? prefs.fundo : 'padrao'

  async function enviarLinkDeSenha() {
    setEnvio({ estado: 'enviando', mensagem: '' })
    try {
      await sendPasswordResetEmail(auth, usuario.email)
      setEnvio({
        estado: 'ok',
        mensagem: `Enviamos um link para ${usuario.email}. Abra o e-mail e siga o passo a passo para criar a nova senha. Se não chegar, olhe também o spam.`,
      })
    } catch (err) {
      const mensagem =
        err.code === 'auth/too-many-requests'
          ? 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
          : err.code === 'auth/network-request-failed'
            ? 'Sem conexão com a internet. Confira a rede e tente de novo.'
            : 'Não foi possível enviar o e-mail agora. Tente de novo em instantes.'
      setEnvio({ estado: 'erro', mensagem })
    }
  }

  return (
    <>
      <header className="cabecalho-pagina">
        <h1>Configurações</h1>
        <p>Suas preferências ficam salvas na sua conta e acompanham você em qualquer aparelho.</p>
      </header>

      <section className="card secao-cadastro secao-config" aria-labelledby="titulo-aparencia">
        <h2 id="titulo-aparencia">Aparência</h2>
        {erro && (
          <p className="mensagem-erro" role="alert">
            {erro}
          </p>
        )}
        <Opcoes legenda="Tema" nome="tema" valor={prefs.tema} opcoes={TEMAS} aoEscolher={(tema) => alterar({ tema })} />
        <Opcoes legenda="Cor principal" nome="acento" valor={prefs.acento} opcoes={ACENTOS} aoEscolher={(acento) => alterar({ acento })} />
        <Opcoes legenda="Cor do fundo" nome="fundo" valor={fundoAtual} opcoes={fundos} aoEscolher={(fundo) => alterar({ fundo })} />
        <Opcoes
          legenda="Ferramentas desenhadas no fundo"
          nome="icones"
          valor={prefs.icones}
          opcoes={ICONES}
          aoEscolher={(icones) => alterar({ icones })}
        />
      </section>

      <section className="card secao-cadastro secao-config so-tela-larga" aria-labelledby="titulo-menu">
        <h2 id="titulo-menu">Menu de navegação</h2>
        <Opcoes legenda="Posição do menu" nome="menu" valor={prefs.menu} opcoes={MENUS} aoEscolher={(menu) => alterar({ menu })} />
        <p className="texto-apoio">No celular e em telas estreitas o menu é sempre a gaveta que abre pelo botão do topo.</p>
      </section>

      {ehAdmin && <SecaoLixeira />}

      <section className="card secao-cadastro secao-config" aria-labelledby="titulo-conta">
        <h2 id="titulo-conta">Minha conta</h2>
        <p className="texto-apoio">
          Para trocar a senha, enviamos um link para <strong>{usuario.email}</strong>. A senha atual continua valendo até você criar uma
          nova pelo link.
        </p>
        <div>
          <button type="button" className="botao botao-secundario" disabled={envio.estado === 'enviando'} onClick={enviarLinkDeSenha}>
            {envio.estado === 'enviando' ? 'Enviando…' : 'Enviar link para trocar a senha'}
          </button>
        </div>
        {envio.estado === 'ok' && (
          <p className="aviso-sucesso" role="status">
            {envio.mensagem}
          </p>
        )}
        {envio.estado === 'erro' && (
          <p className="mensagem-erro" role="alert">
            {envio.mensagem}
          </p>
        )}
      </section>
    </>
  )
}

export default Configuracoes

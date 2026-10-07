import { useState } from 'react'

// Com VITE_LEITOR_URL definido, a tela fala com o programa do leitor instalado no PC do balcão
// (ele usa o SDK do fabricante e responde { biometriaId }). Sem ela, usa um leitor simulado.
const URL_LEITOR = import.meta.env.VITE_LEITOR_URL

async function lerDoLeitor() {
  let resposta
  try {
    resposta = await fetch(`${URL_LEITOR}/ler`, { method: 'POST' })
  } catch {
    throw new Error('Não consegui falar com o leitor de digital. Confira se ele está ligado e o programa do leitor aberto.')
  }
  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok || !dados.biometriaId) throw new Error(dados.mensagem ?? 'Não foi possível ler a digital. Tente de novo.')
  return dados.biometriaId
}

function CapturaDigital({ aoLer, textoBotao = 'Ler digital' }) {
  const [simulada, setSimulada] = useState('')
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState('')

  async function ler(e) {
    e.preventDefault()
    setErro('')
    setLendo(true)
    try {
      const biometriaId = URL_LEITOR ? await lerDoLeitor() : simulada.trim()
      if (!biometriaId) throw new Error('Modo de teste: digite o código da digital cadastrada para essa pessoa.')
      await aoLer(biometriaId)
      setSimulada('')
    } catch (err) {
      setErro(err.message)
    } finally {
      setLendo(false)
    }
  }

  return (
    <form className="form-linha" onSubmit={ler}>
      {!URL_LEITOR && (
        <label className="campo">
          <span>Modo de teste (nenhum leitor conectado): código da digital</span>
          <input value={simulada} onChange={(e) => setSimulada(e.target.value)} autoComplete="off" />
        </label>
      )}
      <button type="submit" className="botao botao-primario" disabled={lendo}>
        {lendo ? 'Lendo…' : textoBotao}
      </button>
      {erro && (
        <p className="mensagem-erro balcao-erro-linha" role="alert">
          {erro}
        </p>
      )}
    </form>
  )
}

export default CapturaDigital

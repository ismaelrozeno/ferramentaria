import { useEffect, useId, useRef } from 'react'

// Janela de confirmação no visual do FERRUM. Usa o <dialog> nativo do navegador:
// prende o foco dentro da janela, fecha com Esc e escurece o fundo.
function Confirmacao({ aberta, titulo, mensagem, textoConfirmar, perigo = false, carregando = false, aoConfirmar, aoCancelar }) {
  const dialogo = useRef(null)
  const idTitulo = useId()

  useEffect(() => {
    const el = dialogo.current
    if (!el) return
    if (aberta && !el.open) el.showModal()
    if (!aberta && el.open) el.close()
  }, [aberta])

  return (
    <dialog
      ref={dialogo}
      className="confirmacao"
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault()
        aoCancelar()
      }}
      onClick={(e) => {
        // clique no fundo escuro (fora da caixa) cancela
        if (e.target === dialogo.current) aoCancelar()
      }}
    >
      <div className="confirmacao-caixa">
        <h2 id={idTitulo}>{titulo}</h2>
        {mensagem && <p>{mensagem}</p>}
        <div className="confirmacao-acoes">
          <button type="button" className="botao botao-secundario" onClick={aoCancelar} autoFocus>
            Cancelar
          </button>
          <button
            type="button"
            className={`botao ${perigo ? 'botao-perigo-cheio' : 'botao-primario'}`}
            onClick={aoConfirmar}
            disabled={carregando}
          >
            {carregando ? 'Aguarde…' : textoConfirmar}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default Confirmacao

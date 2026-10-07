// Pódio com os 3 primeiros e lista com os demais. `campoXp` escolhe a pontuação exibida.
function QuadroRanking({ lista, campoXp, vazio }) {
  if (lista.length === 0) return <p className="estado-vazio">{vazio}</p>

  const podio = [lista[1], lista[0], lista[2]].filter(Boolean)
  const demais = lista.slice(3)

  return (
    <div className="quadro-ranking">
      <ol className="podio" aria-label="Três primeiros colocados">
        {podio.map((pessoa) => (
          <li key={pessoa.posicao} className="podio-lugar" data-lugar={pessoa.posicao}>
            <span className="podio-posicao">{pessoa.posicao}º</span>
            <strong className="podio-nome">{pessoa.nome}</strong>
            <span className="podio-xp">{pessoa[campoXp]} XP</span>
            <span className="selo-liga" data-liga={pessoa.liga}>
              {pessoa.ligaNome}
            </span>
          </li>
        ))}
      </ol>

      {demais.length > 0 && (
        <ol className="lista-ranking" start={4}>
          {demais.map((pessoa) => (
            <li key={pessoa.posicao} className="linha-ranking">
              <span className="linha-posicao">{pessoa.posicao}º</span>
              <span className="linha-nome">
                {pessoa.nome}
                {pessoa.equipe && <small>{pessoa.equipe}</small>}
              </span>
              <span className="selo-liga" data-liga={pessoa.liga}>
                {pessoa.ligaNome}
              </span>
              <span className="linha-sequencia">{pessoa.sequencia > 0 ? `${pessoa.sequencia} seguidas` : ''}</span>
              <span className="linha-xp">{pessoa[campoXp]} XP</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default QuadroRanking

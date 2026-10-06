// Fundo decorativo: parede de ferramentaria (painel perfurado) com
// ferramentas penduradas balançando devagar nos ganchos.
// Só decoração: fica atrás do conteúdo e é ignorado por leitores de tela.

const ferramentas = {
  chave: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  martelo: (
    <>
      <path d="M8 2h8l2 3h-4v1h-4V5H6z" />
      <path d="M10 6h4v15a2 2 0 0 1-4 0z" />
    </>
  ),
  chaveDeFenda: (
    <>
      <rect x="9.5" y="2" width="5" height="9" rx="2" />
      <path d="M12 11v9M11 20l1 3 1-3" />
    </>
  ),
  furadeira: (
    <>
      <path d="M4 3h10a4 4 0 0 1 0 8h-3l-1.2 9H6.2L7.4 11H4z" />
      <path d="M18 7h5M6 7h4" />
    </>
  ),
  trena: (
    <>
      <circle cx="12" cy="11" r="8" />
      <circle cx="12" cy="11" r="3" />
      <path d="M20 17h3v2" />
    </>
  ),
}

// x, y no quadro de 1600 x 1000; `celular: false` some em telas pequenas
const pecas = [
  { tipo: 'chave', x: 300, y: 140, escala: 3.2, duracao: 7, atraso: 0 },
  { tipo: 'martelo', x: 520, y: 380, escala: 3.6, duracao: 8, atraso: -2, celular: false },
  { tipo: 'furadeira', x: 760, y: 120, escala: 3.4, duracao: 9, atraso: -4 },
  { tipo: 'chaveDeFenda', x: 990, y: 340, escala: 3.4, duracao: 6.5, atraso: -1, celular: false },
  { tipo: 'trena', x: 1210, y: 140, escala: 3, duracao: 8.5, atraso: -3 },
  { tipo: 'chave', x: 1430, y: 400, escala: 3.4, duracao: 7.5, atraso: -5, celular: false },
  { tipo: 'trena', x: 420, y: 660, escala: 3, duracao: 9.5, atraso: -6, celular: false },
  { tipo: 'chaveDeFenda', x: 720, y: 600, escala: 3.2, duracao: 7, atraso: -2.5 },
  { tipo: 'furadeira', x: 1010, y: 680, escala: 3.4, duracao: 8, atraso: -1.5, celular: false },
  { tipo: 'martelo', x: 1310, y: 640, escala: 3.4, duracao: 6.8, atraso: -3.5 },
]

function FundoOficina() {
  return (
    <div className="fundo-oficina" aria-hidden="true">
      <div className="fundo-oficina-brilho" />
      <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        {pecas.map((peca, i) => (
          <g
            key={i}
            transform={`translate(${peca.x} ${peca.y}) scale(${peca.escala})`}
            className={peca.celular === false ? 'so-desktop' : undefined}
          >
            <g
              className="balanco"
              style={{ animationDuration: `${peca.duracao}s`, animationDelay: `${peca.atraso}s` }}
            >
              <circle cx="12" cy="-5" r="1.4" className="gancho" />
              <path d="M12 -4v4" />
              {ferramentas[peca.tipo]}
            </g>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default FundoOficina

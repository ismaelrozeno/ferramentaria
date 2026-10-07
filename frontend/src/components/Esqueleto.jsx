function Esqueleto({ linhas = 4 }) {
  return (
    <div className="esqueleto" role="status" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <span key={i} className="esqueleto-linha" style={{ '--largura': `${100 - (i % 3) * 12}%` }} />
      ))}
    </div>
  )
}

export default Esqueleto

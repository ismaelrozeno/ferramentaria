import { Link } from 'react-router'

function NaoEncontrada() {
  return (
    <section className="card em-breve">
      <h1>Página não encontrada</h1>
      <p>O endereço digitado não existe no sistema. Confira o link ou use o menu ao lado.</p>
      <Link to="/" className="botao botao-primario">
        Ir para o dashboard
      </Link>
    </section>
  )
}

export default NaoEncontrada

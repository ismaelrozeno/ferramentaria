import { Link } from 'react-router'

function EmConstrucao({ titulo, descricao }) {
  return (
    <>
      <header className="cabecalho-pagina">
        <h1>{titulo}</h1>
      </header>
      <section className="card em-breve">
        <h2>Em construção</h2>
        <p>{descricao}</p>
        <Link to="/" className="botao botao-secundario">
          Voltar ao dashboard
        </Link>
      </section>
    </>
  )
}

export default EmConstrucao

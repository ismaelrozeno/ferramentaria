import { Link } from 'react-router'

// Indicadores da seção 5 da especificação (parte 1).
// Os valores chegam na fatia do dashboard; até lá, cada card mostra "—".
const indicadores = [
  { nome: 'Total de ferramentas', detalhe: 'Quantidade cadastrada' },
  { nome: 'Valor total', detalhe: 'Soma do valor das ferramentas' },
  { nome: 'Em uso', detalhe: 'Retiradas no momento' },
  { nome: 'Disponíveis', detalhe: 'No almoxarifado, prontas para uso' },
  { nome: 'Paradas', detalhe: 'Sem movimentação além do limite de dias', tom: 'alerta' },
  { nome: 'Valor parado', detalhe: 'Valor das ferramentas paradas', tom: 'alerta' },
  { nome: 'Abaixo do mínimo', detalhe: 'Itens no ponto de pedido', tom: 'alerta' },
  { nome: 'Valor em estoque', detalhe: 'Saldo × custo médio' },
  { nome: 'Alocadas a vencer', detalhe: 'Contrato termina em até 15 dias', tom: 'alerta' },
  { nome: 'Devoluções atrasadas', detalhe: 'Fora do prazo de devolução', tom: 'perigo' },
]

const primeirosPassos = [
  {
    titulo: 'Cadastre as categorias',
    texto: 'Cada categoria tem uma sigla de 3 letras, que entra no código da ferramenta.',
    caminho: '/cadastros',
  },
  {
    titulo: 'Cadastre as ferramentas',
    texto: 'O sistema gera o código e a etiqueta com código de barras.',
    caminho: '/catalogo',
  },
  {
    titulo: 'Cadastre os colaboradores',
    texto: 'Matrícula, equipe e digital de quem retira ferramentas.',
    caminho: '/colaboradores',
  },
  {
    titulo: 'Registre a primeira retirada',
    texto: 'No balcão, leia o código de barras e confirme com a digital.',
    caminho: '/balcao',
  },
]

function Dashboard() {
  return (
    <>
      <header className="cabecalho-pagina">
        <h1>Dashboard</h1>
        <p>Situação da ferramentaria, atualizada a cada 30 segundos.</p>
      </header>

      <section className="secao" aria-labelledby="titulo-indicadores">
        <div className="secao-cabecalho">
          <h2 id="titulo-indicadores">Indicadores</h2>
          <p>Os números aparecem assim que houver ferramentas cadastradas.</p>
        </div>
        <div className="grade-indicadores">
          {indicadores.map((indicador) => (
            <article key={indicador.nome} className="card indicador" data-tom={indicador.tom}>
              <h3 className="indicador-nome">{indicador.nome}</h3>
              <p className="indicador-valor" data-vazio="true">
                —
              </p>
              <p className="indicador-detalhe">{indicador.detalhe}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="secao" aria-labelledby="titulo-passos">
        <div className="secao-cabecalho">
          <h2 id="titulo-passos">Para começar</h2>
          <p>Siga esta ordem: cada passo usa o anterior.</p>
        </div>
        <ol className="passos">
          {primeirosPassos.map((passo) => (
            <li key={passo.caminho}>
              <Link to={passo.caminho} className="card passo">
                <h3>{passo.titulo}</h3>
                <p>{passo.texto}</p>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

export default Dashboard

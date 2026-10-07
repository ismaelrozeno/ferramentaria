import { useState } from "react";
import { api } from "../services/api.js";
import BuscaColaboradorPorNome from "./BuscaColaboradorPorNome.jsx";
import CapturaDigital from "./CapturaDigital.jsx";

// Como o balcão acha a pessoa: pela digital (normal) ou, em último caso, pelo nome.
// Devolve o colaborador com as ferramentas que estão com ele; `biometriaId` só vem se foi pela digital.
function IdentificarColaborador({ acao, aoIdentificar }) {
  const [pelaNome, setPelaNome] = useState(false);
  const [erro, setErro] = useState("");
  const [buscando, setBuscando] = useState(false);

  const verbo = acao === "devolver" ? "devolver" : "retirar";

  function confirmarAtivo(encontrado) {
    if (!encontrado.ativo) {
      throw new Error(`${encontrado.nome} está desativado e não pode ${verbo}.`);
    }
  }

  async function pelaDigital(biometriaId) {
    setErro("");
    const encontrado = await api.post("/balcao/identificacao", { biometriaId });
    confirmarAtivo(encontrado);
    aoIdentificar({ ...encontrado, biometriaId });
  }

  async function pelosDadosDoNome(colaborador) {
    setErro("");
    setBuscando(true);
    try {
      const encontrado = await api.get(
        `/colaboradores/${encodeURIComponent(colaborador.matricula)}`,
      );
      confirmarAtivo(encontrado);
      aoIdentificar(encontrado);
    } catch (err) {
      setErro(err.message);
    } finally {
      setBuscando(false);
    }
  }

  if (pelaNome) {
    return (
      <>
        <p className="texto-apoio">
          Sem a digital, procure a pessoa pelo nome. Depois será preciso dizer o motivo.
        </p>
        <BuscaColaboradorPorNome aoEscolher={pelosDadosDoNome} desabilitado={buscando} />
        {erro && (
          <p className="mensagem-erro" role="alert">
            {erro}
          </p>
        )}
        <div>
          <button
            type="button"
            className="botao botao-secundario botao-pequeno"
            onClick={() => {
              setErro("");
              setPelaNome(false);
            }}
          >
            Voltar para a digital
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="texto-apoio">
        Peça para o colaborador posicionar o dedo no leitor.
      </p>
      <CapturaDigital aoLer={pelaDigital} />
      <div>
        <button
          type="button"
          className="botao botao-secundario botao-pequeno"
          onClick={() => setPelaNome(true)}
        >
          Digital não funcionou: procurar pelo nome
        </button>
      </div>
    </>
  );
}

export default IdentificarColaborador;

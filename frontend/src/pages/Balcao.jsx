import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import CapturaDigital from "../components/CapturaDigital.jsx";
import { api } from "../services/api.js";
import Esqueleto from '../components/Esqueleto.jsx'

const MOTIVOS = [
  "Leitor de digital com defeito",
  "Digital não reconhecida",
  "Colaborador sem digital cadastrada",
  "Outro",
];

const SITUACAO = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  parada: "Parada",
  manutencao: "Em manutenção",
};

const hoje = () => new Date().toLocaleDateString("en-CA");
const dataBr = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
const horaBr = (iso) =>
  new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

// Leitor de código de barras age como teclado: digita o código e aperta Enter.
function CampoCodigo({ rotulo, aoEncontrar }) {
  const campo = useRef(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [buscando, setBuscando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    const limpo = codigo.trim().toUpperCase();
    if (!limpo) return;
    setErro("");
    setBuscando(true);
    try {
      const item = await api.get(`/itens/codigo/${encodeURIComponent(limpo)}`);
      const rejeitado = aoEncontrar(item);
      if (rejeitado) setErro(rejeitado);
      else setCodigo("");
    } catch (err) {
      setErro(err.message);
    } finally {
      setBuscando(false);
      campo.current?.focus();
    }
  }

  return (
    <form className="form-linha" onSubmit={enviar}>
      <label className="campo">
        <span>{rotulo}</span>
        <input
          ref={campo}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Passe o leitor ou digite o código"
          autoComplete="off"
        />
      </label>
      <button
        type="submit"
        className="botao botao-secundario"
        disabled={buscando || !codigo.trim()}
      >
        {buscando ? "Buscando…" : "Adicionar"}
      </button>
      {erro && (
        <p className="mensagem-erro balcao-erro-linha" role="alert">
          {erro}
        </p>
      )}
    </form>
  );
}

function Retirada() {
  const queryClient = useQueryClient();
  const [matricula, setMatricula] = useState("");
  const [colaborador, setColaborador] = useState(null);
  const [usarMatricula, setUsarMatricula] = useState(false);
  const [erroColaborador, setErroColaborador] = useState("");
  const [motivo, setMotivo] = useState("");
  const [motivoOutro, setMotivoOutro] = useState("");
  const [prazo, setPrazo] = useState("");
  const [lista, setLista] = useState([]);
  const [concluida, setConcluida] = useState(null);

  const justificativa = motivo === "Outro" ? motivoOutro.trim() : motivo;
  const temFerramenta = lista.some((i) => i.tipo === "ferramenta");

  const confirmar = useMutation({
    mutationFn: () =>
      api.post("/balcao/retiradas", {
        ...(colaborador.biometriaId
          ? { biometriaId: colaborador.biometriaId }
          : { matricula: colaborador.matricula, justificativa }),
        prazoDevolucao: temFerramenta && prazo ? prazo : undefined,
        itens: lista.map((i) => ({
          codigo: i.codigo,
          quantidade: i.quantidade,
        })),
      }),
    onSuccess: (resultado) => {
      setConcluida(resultado);
      setLista([]);
      setColaborador(null);
      setUsarMatricula(false);
      setMatricula("");
      setMotivo("");
      setMotivoOutro("");
      setPrazo("");
      queryClient.invalidateQueries({ queryKey: ["balcao"] });
      queryClient.invalidateQueries({ queryKey: ["itens"] });
    },
  });

  async function identificarPelaDigital(biometriaId) {
    setErroColaborador("");
    setConcluida(null);
    confirmar.reset();
    try {
      const encontrado = await api.post("/balcao/identificacao", {
        biometriaId,
      });
      if (!encontrado.ativo)
        throw new Error(
          `${encontrado.nome} está desativado e não pode retirar.`,
        );
      setColaborador({ ...encontrado, biometriaId });
    } catch (err) {
      setColaborador(null);
      throw err;
    }
  }

  async function buscarColaborador(e) {
    e.preventDefault();
    const m = matricula.trim();
    if (!m) return;
    setErroColaborador("");
    setConcluida(null);
    confirmar.reset();
    try {
      const encontrado = await api.get(
        `/colaboradores/${encodeURIComponent(m)}`,
      );
      if (!encontrado.ativo)
        setErroColaborador(
          `${encontrado.nome} está desativado e não pode retirar.`,
        );
      else setColaborador(encontrado);
    } catch (err) {
      setColaborador(null);
      setErroColaborador(err.message);
    }
  }

  function adicionar(item) {
    if (lista.some((i) => i.codigo === item.codigo))
      return `${item.codigo} já está na lista.`;
    if (!item.ativo) return `${item.codigo} (${item.nome}) está desativado.`;
    if (
      item.tipo === "ferramenta" &&
      !["disponivel", "parada"].includes(item.ferramenta?.status)
    ) {
      const quem = item.ferramenta?.colaboradorNome;
      return `${item.codigo} (${item.nome}) está ${SITUACAO[item.ferramenta?.status]?.toLowerCase()}${quem ? ` com ${quem}` : ""}.`;
    }
    if (item.tipo === "consumo" && item.saldo < 1)
      return `${item.codigo} (${item.nome}) está sem saldo.`;
    setLista((atual) => [
      ...atual,
      {
        codigo: item.codigo,
        nome: item.nome,
        tipo: item.tipo,
        saldo: item.saldo,
        quantidade: 1,
      },
    ]);
    return "";
  }

  function mudarQuantidade(codigo, valor) {
    setLista((atual) =>
      atual.map((i) =>
        i.codigo === codigo
          ? {
              ...i,
              quantidade: Math.max(1, Math.min(i.saldo, Number(valor) || 1)),
            }
          : i,
      ),
    );
  }

  const precisaMotivo = colaborador && !colaborador.biometriaId;
  const podeConfirmar =
    colaborador &&
    lista.length > 0 &&
    (!precisaMotivo || justificativa.length >= 5) &&
    !confirmar.isPending;

  return (
    <>
      {concluida && (
        <div className="aviso-sucesso" role="status">
          <strong>
            Retirada registrada para {concluida.colaborador.nome}:
          </strong>
          <ul className="balcao-resumo">
            {concluida.itens.map((i) => (
              <li key={i.codigo}>
                {i.codigo} · {i.nome}
                {i.quantidade > 1 && ` · ${i.quantidade} un`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="card secao-cadastro" aria-labelledby="titulo-quem">
        <h2 id="titulo-quem">1. Quem está retirando?</h2>
        {colaborador ? (
          <div className="balcao-colaborador">
            <div>
              <p className="usuario-nome">{colaborador.nome}</p>
              <p className="texto-apoio">
                Matrícula {colaborador.matricula}
                {colaborador.equipe && ` · ${colaborador.equipe}`} ·{" "}
                {colaborador.biometriaId
                  ? "Identificado pela digital"
                  : "Identificado pela matrícula"}
              </p>
              {colaborador.ferramentasEmUso.length > 0 && (
                <p className="texto-apoio">
                  Já está com:{" "}
                  {colaborador.ferramentasEmUso
                    .map(
                      (f) =>
                        `${f.codigo}${f.prazoDevolucao ? ` (até ${dataBr(f.prazoDevolucao)})` : ""}`,
                    )
                    .join(", ")}
                </p>
              )}
            </div>
            <button
              type="button"
              className="botao botao-secundario botao-pequeno"
              onClick={() => setColaborador(null)}
            >
              Trocar
            </button>
          </div>
        ) : usarMatricula ? (
          <form className="form-linha" onSubmit={buscarColaborador}>
            <label className="campo">
              <span>Matrícula</span>
              <input
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              className="botao botao-primario"
              disabled={!matricula.trim()}
            >
              Buscar
            </button>
            <button
              type="button"
              className="botao botao-secundario"
              onClick={() => setUsarMatricula(false)}
            >
              Voltar para a digital
            </button>
          </form>
        ) : (
          <>
            <p className="texto-apoio">
              Peça para o colaborador posicionar o dedo no leitor.
            </p>
            <CapturaDigital aoLer={identificarPelaDigital} />
            <button
              type="button"
              className="botao botao-secundario botao-pequeno"
              onClick={() => setUsarMatricula(true)}
            >
              Digital não funcionou: usar matrícula
            </button>
          </>
        )}
        {erroColaborador && (
          <p className="mensagem-erro" role="alert">
            {erroColaborador}
          </p>
        )}
      </section>

      {colaborador && (
        <>
          <section
            className="card secao-cadastro"
            aria-labelledby="titulo-itens"
          >
            <h2 id="titulo-itens">2. O que está levando?</h2>
            <CampoCodigo rotulo="Código do item" aoEncontrar={adicionar} />
            {lista.length === 0 ? (
              <p className="estado-vazio">Nenhum item ainda.</p>
            ) : (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Item</th>
                    <th>Quantidade</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((i) => (
                    <tr key={i.codigo}>
                      <td>{i.codigo}</td>
                      <td>{i.nome}</td>
                      <td>
                        {i.tipo === "ferramenta" ? (
                          "1"
                        ) : (
                          <input
                            className="balcao-quantidade"
                            type="number"
                            min="1"
                            max={i.saldo}
                            value={i.quantidade}
                            aria-label={`Quantidade de ${i.nome} (saldo ${i.saldo})`}
                            onChange={(e) =>
                              mudarQuantidade(i.codigo, e.target.value)
                            }
                          />
                        )}
                      </td>
                      <td className="celula-acao">
                        <button
                          type="button"
                          className="botao botao-secundario botao-pequeno"
                          onClick={() =>
                            setLista((atual) =>
                              atual.filter((x) => x.codigo !== i.codigo),
                            )
                          }
                        >
                          Tirar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {temFerramenta && (
              <label className="campo balcao-prazo">
                <span>Prazo de devolução (opcional)</span>
                <input
                  type="date"
                  min={hoje()}
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                />
              </label>
            )}
          </section>

          {precisaMotivo && (
            <section
              className="card secao-cadastro"
              aria-labelledby="titulo-motivo"
            >
              <h2 id="titulo-motivo">3. Por que não foi pela digital?</h2>
              <fieldset className="escolha-tipo">
                <legend className="sr-only">Motivo</legend>
                {MOTIVOS.map((m) => (
                  <label key={m} className="opcao">
                    <input
                      type="radio"
                      name="motivo"
                      value={m}
                      checked={motivo === m}
                      onChange={() => setMotivo(m)}
                    />
                    <span>
                      <strong>{m}</strong>
                    </span>
                  </label>
                ))}
              </fieldset>
              {motivo === "Outro" && (
                <label className="campo">
                  <span>Explique (mínimo 5 letras)</span>
                  <input
                    value={motivoOutro}
                    maxLength={200}
                    onChange={(e) => setMotivoOutro(e.target.value)}
                  />
                </label>
              )}
            </section>
          )}

          <section className="card secao-cadastro">
            {confirmar.isError && (
              <p className="mensagem-erro" role="alert">
                {confirmar.error.message}
              </p>
            )}
            <div className="acoes-formulario">
              <button
                type="button"
                className="botao botao-primario"
                disabled={!podeConfirmar}
                onClick={() => confirmar.mutate()}
              >
                {confirmar.isPending
                  ? "Registrando…"
                  : `Confirmar retirada (${lista.length})`}
              </button>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function Devolucao() {
  const queryClient = useQueryClient();
  const [lista, setLista] = useState([]);
  const [devolvidoPor, setDevolvidoPor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [concluida, setConcluida] = useState(null);

  const confirmar = useMutation({
    mutationFn: () =>
      api.post("/balcao/devolucoes", {
        codigos: lista.map((i) => i.codigo),
        devolvidoPorMatricula: devolvidoPor.trim() || undefined,
        observacao: observacao.trim() || undefined,
      }),
    onSuccess: (resultado) => {
      setConcluida(resultado);
      setLista([]);
      setDevolvidoPor("");
      setObservacao("");
      queryClient.invalidateQueries({ queryKey: ["balcao"] });
      queryClient.invalidateQueries({ queryKey: ["itens"] });
    },
  });

  function adicionar(item) {
    setConcluida(null);
    confirmar.reset();
    if (lista.some((i) => i.codigo === item.codigo))
      return `${item.codigo} já está na lista.`;
    if (item.tipo !== "ferramenta")
      return `${item.codigo} (${item.nome}) é material de consumo: não se devolve.`;
    const status = item.ferramenta?.status;
    if (status !== "em_uso")
      return `${item.codigo} (${item.nome}) não está em uso (${SITUACAO[status]?.toLowerCase()}).`;
    setLista((atual) => [
      ...atual,
      {
        codigo: item.codigo,
        nome: item.nome,
        responsavel: item.ferramenta.colaboradorNome,
        prazo: item.ferramenta.prazoDevolucao,
      },
    ]);
    return "";
  }

  return (
    <>
      {concluida && (
        <div className="aviso-sucesso" role="status">
          <strong>Devolução registrada:</strong>
          <ul className="balcao-resumo">
            {concluida.itens.map((i) => (
              <li key={i.codigo}>
                {i.codigo} · {i.nome} · de {i.responsavel}
                {i.noPrazo === false && " · fora do prazo"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section
        className="card secao-cadastro"
        aria-labelledby="titulo-devolver"
      >
        <h2 id="titulo-devolver">Ferramentas devolvidas</h2>
        <CampoCodigo rotulo="Código da ferramenta" aoEncontrar={adicionar} />
        {lista.length === 0 ? (
          <p className="estado-vazio">Nenhuma ferramenta ainda.</p>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Ferramenta</th>
                <th>Estava com</th>
                <th>Prazo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((i) => (
                <tr key={i.codigo}>
                  <td>{i.codigo}</td>
                  <td>{i.nome}</td>
                  <td>{i.responsavel}</td>
                  <td>{i.prazo ? dataBr(i.prazo) : "—"}</td>
                  <td className="celula-acao">
                    <button
                      type="button"
                      className="botao botao-secundario botao-pequeno"
                      onClick={() =>
                        setLista((atual) =>
                          atual.filter((x) => x.codigo !== i.codigo),
                        )
                      }
                    >
                      Tirar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="grade-campos">
          <label className="campo">
            <span>Matrícula de quem devolveu (se não for quem retirou)</span>
            <input
              value={devolvidoPor}
              onChange={(e) => setDevolvidoPor(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="campo">
            <span>Observação (opcional)</span>
            <input
              value={observacao}
              maxLength={200}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </label>
        </div>
        {confirmar.isError && (
          <p className="mensagem-erro" role="alert">
            {confirmar.error.message}
          </p>
        )}
        <div className="acoes-formulario">
          <button
            type="button"
            className="botao botao-primario"
            disabled={lista.length === 0 || confirmar.isPending}
            onClick={() => confirmar.mutate()}
          >
            {confirmar.isPending
              ? "Registrando…"
              : `Confirmar devolução (${lista.length})`}
          </button>
        </div>
      </section>
    </>
  );
}

function Ultimas() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["balcao", "ultimas"],
    queryFn: () => api.get("/balcao/ultimas"),
    refetchInterval: 30000,
  });

  return (
    <section className="card secao-cadastro" aria-labelledby="titulo-ultimas">
      <h2 id="titulo-ultimas">Últimas operações</h2>
      {isPending && <Esqueleto linhas={4} />}
      {isError && <p className="mensagem-erro">{error.message}</p>}
      {data && data.length === 0 && (
        <p className="estado-vazio">Nenhuma retirada ou devolução ainda.</p>
      )}
      {data && data.length > 0 && (
        <table className="tabela">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Operação</th>
              <th>Item</th>
              <th>Colaborador</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id}>
                <td>{horaBr(m.data)}</td>
                <td>{m.tipo === "retirada" ? "Retirada" : "Devolução"}</td>
                <td>
                  {m.itemCodigo} · {m.itemNome}
                  {m.tipo === "retirada" &&
                    m.quantidade > 1 &&
                    ` (${m.quantidade} un)`}
                </td>
                <td>{m.colaboradorNome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Balcao() {
  const [aba, setAba] = useState("retirada");

  return (
    <>
      <header className="cabecalho-pagina">
        <h1>Balcão</h1>
        <p>
          Retirada e devolução. O colaborador se identifica pela digital; se ela
          não funcionar, use a matrícula e o motivo fica registrado.
        </p>
      </header>

      <fieldset className="escolha-tipo balcao-abas">
        <legend className="sr-only">Operação</legend>
        <label className="opcao">
          <input
            type="radio"
            name="aba"
            checked={aba === "retirada"}
            onChange={() => setAba("retirada")}
          />
          <span>
            <strong>Retirada</strong>
            Colaborador leva ferramentas ou materiais.
          </span>
        </label>
        <label className="opcao">
          <input
            type="radio"
            name="aba"
            checked={aba === "devolucao"}
            onChange={() => setAba("devolucao")}
          />
          <span>
            <strong>Devolução</strong>
            Ferramentas voltam ao almoxarifado.
          </span>
        </label>
      </fieldset>

      {aba === "retirada" ? <Retirada /> : <Devolucao />}
      <Ultimas />
    </>
  );
}

export default Balcao;

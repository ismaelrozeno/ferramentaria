import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import Esqueleto from "../components/Esqueleto.jsx";
import IdentificarColaborador from "../components/IdentificarColaborador.jsx";
import MotivoSemDigital from "../components/MotivoSemDigital.jsx";
import { api } from "../services/api.js";
import { justificativaDe, textoAssinatura } from "../utils/balcao.js";

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

// Cartão da pessoa já identificada, com como ela foi achada e o botão de trocar.
function CartaoColaborador({ colaborador, aoTrocar, children }) {
  return (
    <div className="balcao-colaborador">
      <div>
        <p className="usuario-nome">{colaborador.nome}</p>
        <p className="texto-apoio">
          Matrícula {colaborador.matricula}
          {colaborador.equipe && ` · ${colaborador.equipe}`} ·{" "}
          {colaborador.biometriaId
            ? "Assinou pela digital"
            : "Sem digital (nome e motivo)"}
        </p>
        {children}
      </div>
      <button
        type="button"
        className="botao botao-secundario botao-pequeno"
        onClick={aoTrocar}
      >
        Trocar
      </button>
    </div>
  );
}

function Retirada() {
  const queryClient = useQueryClient();
  const [colaborador, setColaborador] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [motivoOutro, setMotivoOutro] = useState("");
  const [prazo, setPrazo] = useState("");
  const [lista, setLista] = useState([]);
  const [concluida, setConcluida] = useState(null);

  const justificativa = justificativaDe(motivo, motivoOutro);
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
      setMotivo("");
      setMotivoOutro("");
      setPrazo("");
      queryClient.invalidateQueries({ queryKey: ["balcao"] });
      queryClient.invalidateQueries({ queryKey: ["itens"] });
    },
  });

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
            Retirada registrada e assinada por {concluida.colaborador.nome}:
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
          <CartaoColaborador
            colaborador={colaborador}
            aoTrocar={() => setColaborador(null)}
          >
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
          </CartaoColaborador>
        ) : (
          <IdentificarColaborador
            acao="retirar"
            aoIdentificar={(encontrado) => {
              setConcluida(null);
              confirmar.reset();
              setColaborador(encontrado);
            }}
          />
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
            <MotivoSemDigital
              titulo="3. Por que não foi pela digital?"
              motivo={motivo}
              aoMudarMotivo={setMotivo}
              outro={motivoOutro}
              aoMudarOutro={setMotivoOutro}
            />
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
  const [quem, setQuem] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [motivoOutro, setMotivoOutro] = useState("");
  const [lista, setLista] = useState([]);
  const [observacao, setObservacao] = useState("");
  const [concluida, setConcluida] = useState(null);

  const justificativa = justificativaDe(motivo, motivoOutro);
  const precisaMotivo = quem && !quem.biometriaId;

  const confirmar = useMutation({
    mutationFn: () =>
      api.post("/balcao/devolucoes", {
        codigos: lista.map((i) => i.codigo),
        ...(quem.biometriaId
          ? { devolvidoPorBiometriaId: quem.biometriaId }
          : { devolvidoPorMatricula: quem.matricula, justificativa }),
        observacao: observacao.trim() || undefined,
      }),
    onSuccess: (resultado) => {
      setConcluida(resultado);
      setLista([]);
      setQuem(null);
      setMotivo("");
      setMotivoOutro("");
      setObservacao("");
      queryClient.invalidateQueries({ queryKey: ["balcao"] });
      queryClient.invalidateQueries({ queryKey: ["itens"] });
    },
  });

  function incluir(ferramenta) {
    setLista((atual) =>
      atual.some((i) => i.codigo === ferramenta.codigo)
        ? atual
        : [...atual, ferramenta],
    );
  }

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
    incluir({
      codigo: item.codigo,
      nome: item.nome,
      responsavel: item.ferramenta.colaboradorNome,
      prazo: item.ferramenta.prazoDevolucao,
    });
    return "";
  }

  const comEle = (quem?.ferramentasEmUso ?? []).filter(
    (f) => !lista.some((i) => i.codigo === f.codigo),
  );
  const daPessoa = (f) => ({
    codigo: f.codigo,
    nome: f.nome,
    responsavel: quem.nome,
    prazo: f.prazoDevolucao,
  });

  const podeConfirmar =
    quem &&
    lista.length > 0 &&
    (!precisaMotivo || justificativa.length >= 5) &&
    !confirmar.isPending;

  return (
    <>
      {concluida && (
        <div className="aviso-sucesso" role="status">
          <strong>
            Devolução registrada. Recebimento assinado por{" "}
            {concluida.assinadoPor.nome}:
          </strong>
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

      <section className="card secao-cadastro" aria-labelledby="titulo-quem">
        <h2 id="titulo-quem">1. Quem está devolvendo?</h2>
        {quem ? (
          <CartaoColaborador colaborador={quem} aoTrocar={() => setQuem(null)}>
            {quem.ferramentasEmUso.length === 0 && (
              <p className="texto-apoio">Não está com nenhuma ferramenta.</p>
            )}
          </CartaoColaborador>
        ) : (
          <IdentificarColaborador
            acao="devolver"
            aoIdentificar={(encontrado) => {
              setConcluida(null);
              confirmar.reset();
              setQuem(encontrado);
            }}
          />
        )}
      </section>

      {quem && (
        <>
          {quem.ferramentasEmUso.length > 0 && (
            <section
              className="card secao-cadastro"
              aria-labelledby="titulo-com-ele"
            >
              <div className="balcao-colaborador">
                <h2 id="titulo-com-ele">Ferramentas que estão com {quem.nome}</h2>
                {comEle.length > 1 && (
                  <button
                    type="button"
                    className="botao botao-secundario botao-pequeno"
                    onClick={() => comEle.forEach((f) => incluir(daPessoa(f)))}
                  >
                    Devolver todas
                  </button>
                )}
              </div>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Ferramenta</th>
                    <th>Prazo</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {quem.ferramentasEmUso.map((f) => {
                    const naLista = lista.some((i) => i.codigo === f.codigo);
                    return (
                      <tr key={f.id}>
                        <td>{f.codigo}</td>
                        <td>{f.nome}</td>
                        <td>{f.prazoDevolucao ? dataBr(f.prazoDevolucao) : "—"}</td>
                        <td className="celula-acao">
                          <button
                            type="button"
                            className="botao botao-secundario botao-pequeno"
                            disabled={naLista}
                            onClick={() => incluir(daPessoa(f))}
                          >
                            {naLista ? "Na lista" : "Devolver"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          <section
            className="card secao-cadastro"
            aria-labelledby="titulo-devolver"
          >
            <h2 id="titulo-devolver">2. Ferramentas devolvidas</h2>
            <p className="texto-apoio">
              Escolha acima ou passe o leitor no código da ferramenta (também
              serve para ferramenta que era de outra pessoa).
            </p>
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
            <label className="campo">
              <span>Observação (opcional)</span>
              <input
                value={observacao}
                maxLength={200}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </label>
          </section>

          {precisaMotivo && (
            <MotivoSemDigital
              titulo="3. Por que não foi pela digital?"
              motivo={motivo}
              aoMudarMotivo={setMotivo}
              outro={motivoOutro}
              aoMudarOutro={setMotivoOutro}
            />
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
                  : `Confirmar devolução (${lista.length})`}
              </button>
            </div>
          </section>
        </>
      )}
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
              <th>Assinatura</th>
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
                <td>{textoAssinatura(m.assinatura)}</td>
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
          Retirada e devolução. A digital é a assinatura: de retirada, de quem
          leva, e de recebimento, de quem entrega. Qualquer pessoa pode assinar a
          devolução de uma ferramenta que está no nome de outra. Se a digital
          não funcionar, procure pelo nome e o motivo fica registrado.
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

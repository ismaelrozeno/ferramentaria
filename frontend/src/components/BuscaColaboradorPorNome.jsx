import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { api } from "../services/api.js";
import { semAcento } from "../utils/balcao.js";

const MAXIMO_SUGESTOES = 8;

// Último recurso para achar a pessoa: digita o nome e os colaboradores ativos vão aparecendo.
function BuscaColaboradorPorNome({ aoEscolher, desabilitado = false }) {
  const idLista = useId();
  const [texto, setTexto] = useState("");
  const [indice, setIndice] = useState(-1);

  const colaboradores = useQuery({
    queryKey: ["colaboradores"],
    queryFn: () => api.get("/colaboradores"),
  });

  const termo = semAcento(texto).trim();
  const sugestoes = termo
    ? (colaboradores.data ?? [])
        .filter((c) => c.ativo && semAcento(c.nome).includes(termo))
        .sort(
          (a, b) =>
            Number(semAcento(b.nome).startsWith(termo)) -
            Number(semAcento(a.nome).startsWith(termo)),
        )
        .slice(0, MAXIMO_SUGESTOES)
    : [];

  function escolher(colaborador) {
    setTexto("");
    setIndice(-1);
    aoEscolher(colaborador);
  }

  function aoTeclar(e) {
    if (e.key === "ArrowDown" && sugestoes.length > 0) {
      e.preventDefault();
      setIndice((atual) => (atual + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp" && sugestoes.length > 0) {
      e.preventDefault();
      setIndice((atual) => (atual <= 0 ? sugestoes.length - 1 : atual - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const escolhida = sugestoes[indice] ?? (sugestoes.length === 1 ? sugestoes[0] : null);
      if (escolhida) escolher(escolhida);
    } else if (e.key === "Escape") {
      setTexto("");
      setIndice(-1);
    }
  }

  return (
    <div className="busca-nome">
      <label className="campo">
        <span>Nome do colaborador</span>
        <input
          role="combobox"
          aria-expanded={sugestoes.length > 0}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={indice >= 0 ? `${idLista}-${indice}` : undefined}
          value={texto}
          disabled={desabilitado}
          placeholder="Comece a digitar o nome"
          autoComplete="off"
          onChange={(e) => {
            setTexto(e.target.value);
            setIndice(-1);
          }}
          onKeyDown={aoTeclar}
        />
      </label>

      {termo && colaboradores.isPending && (
        <p className="texto-apoio">Carregando colaboradores…</p>
      )}
      {termo && colaboradores.isError && (
        <p className="mensagem-erro" role="alert">
          {colaboradores.error.message}
        </p>
      )}
      {termo && colaboradores.data && sugestoes.length === 0 && (
        <p className="texto-apoio">Nenhum colaborador ativo com esse nome.</p>
      )}

      {sugestoes.length > 0 && (
        <ul id={idLista} role="listbox" className="sugestoes" aria-label="Colaboradores encontrados">
          {sugestoes.map((c, i) => (
            <li
              key={c.id}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={i === indice}
            >
              <button type="button" className="sugestao" onClick={() => escolher(c)}>
                <strong>{c.nome}</strong>
                <small>
                  Matrícula {c.matricula}
                  {c.equipe && ` · ${c.equipe}`}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BuscaColaboradorPorNome;

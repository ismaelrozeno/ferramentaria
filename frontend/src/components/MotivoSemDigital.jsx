import { MOTIVOS } from "../utils/balcao.js";

// Motivo obrigatório quando a pessoa foi achada pelo nome e não pela digital.
function MotivoSemDigital({ titulo, motivo, aoMudarMotivo, outro, aoMudarOutro }) {
  return (
    <section className="card secao-cadastro" aria-labelledby="titulo-motivo">
      <h2 id="titulo-motivo">{titulo}</h2>
      <fieldset className="escolha-tipo">
        <legend className="sr-only">Motivo</legend>
        {MOTIVOS.map((m) => (
          <label key={m} className="opcao">
            <input
              type="radio"
              name="motivo"
              value={m}
              checked={motivo === m}
              onChange={() => aoMudarMotivo(m)}
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
            value={outro}
            maxLength={200}
            onChange={(e) => aoMudarOutro(e.target.value)}
          />
        </label>
      )}
    </section>
  );
}

export default MotivoSemDigital;

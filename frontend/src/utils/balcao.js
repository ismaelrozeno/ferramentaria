export const MOTIVOS = [
  "Leitor de digital com defeito",
  "Digital não reconhecida",
  "Colaborador sem digital cadastrada",
  "Outro",
];

// Texto do motivo que vai para o registro: o escolhido, ou o que a pessoa escreveu em "Outro".
export const justificativaDe = (motivo, outro) =>
  motivo === "Outro" ? outro.trim() : motivo;

// Como a assinatura aparece no histórico: quem assinou e se foi pela digital ou sem ela (com o motivo).
export function textoAssinatura(assinatura) {
  if (!assinatura) return '—';
  if (assinatura.metodo === 'biometria') return `${assinatura.nome} · digital`;
  return `${assinatura.nome} · sem digital${assinatura.justificativa ? ` (${assinatura.justificativa})` : ''}`;
}

// Compara nomes sem acento e sem diferença de maiúsculas (José = jose).
export const semAcento = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

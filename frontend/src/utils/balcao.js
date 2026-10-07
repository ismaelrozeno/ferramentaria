export const MOTIVOS = [
  "Leitor de digital com defeito",
  "Digital não reconhecida",
  "Colaborador sem digital cadastrada",
  "Outro",
];

// Texto do motivo que vai para o registro: o escolhido, ou o que a pessoa escreveu em "Outro".
export const justificativaDe = (motivo, outro) =>
  motivo === "Outro" ? outro.trim() : motivo;

// Compara nomes sem acento e sem diferença de maiúsculas (José = jose).
export const semAcento = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

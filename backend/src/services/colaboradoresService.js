const { Timestamp } = require('firebase-admin/firestore');
const { db } = require('../config/firebase');
const { conflito, naoEncontrado } = require('../utils/erros');
const { docParaJson } = require('../utils/serializar');

const colaboradores = () => db.collection('colaboradores');

// O ID do documento é a matrícula: garante que ela não se repita.
const TAMANHO_LOTE = 400;

async function listar() {
  const snap = await colaboradores().orderBy('nome').get();
  return snap.docs.map(docParaJson);
}

// Colaborador + ferramentas que estão com ele agora (usado no balcão).
async function buscar(matricula) {
  const snap = await colaboradores().doc(matricula).get();
  if (!snap.exists) throw naoEncontrado('COLABORADOR_NAO_ENCONTRADO', `Não existe colaborador com a matrícula ${matricula}.`);
  return comFerramentasEmUso(snap);
}

async function buscarPorBiometria(biometriaId) {
  const achados = await colaboradores().where('biometriaId', '==', biometriaId).limit(1).get();
  if (achados.empty) {
    throw naoEncontrado('DIGITAL_NAO_RECONHECIDA', 'Digital não reconhecida. Tente de novo ou identifique pela matrícula.');
  }
  return comFerramentasEmUso(achados.docs[0]);
}

// Vincula a digital ao colaborador; uma digital não pode pertencer a duas pessoas.
async function cadastrarBiometria(matricula, biometriaId) {
  const ref = colaboradores().doc(matricula);
  await db.runTransaction(async (tx) => {
    const [snap, outros] = await Promise.all([
      tx.get(ref),
      tx.get(colaboradores().where('biometriaId', '==', biometriaId).limit(2)),
    ]);
    if (!snap.exists) throw naoEncontrado('COLABORADOR_NAO_ENCONTRADO', 'Colaborador não encontrado.');
    const dono = outros.docs.find((doc) => doc.id !== matricula);
    if (dono) throw conflito('DIGITAL_EM_USO', `Essa digital já está cadastrada para ${dono.data().nome}.`);
    tx.update(ref, { biometriaId, atualizadoEm: Timestamp.now() });
  });
  return docParaJson(await ref.get());
}

async function comFerramentasEmUso(snap) {
  const matricula = snap.id;
  const emUso = await db.collection('ferramentas').where('colaboradorId', '==', matricula).get();
  const itensSnaps = emUso.empty ? [] : await db.getAll(...emUso.docs.map((doc) => db.collection('itens').doc(doc.id)));
  const ferramentasEmUso = emUso.docs
    .map((doc, i) => ({
      id: doc.id,
      codigo: itensSnaps[i].data()?.codigo ?? doc.id,
      nome: itensSnaps[i].data()?.nome ?? null,
      prazoDevolucao: doc.data().prazoDevolucao ?? null,
    }))
    .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));
  return { ...docParaJson(snap), ferramentasEmUso };
}

function novoDocumento({ matricula, nome, equipe }) {
  const agora = Timestamp.now();
  return { matricula, nome, equipe, ativo: true, biometriaId: null, xp: 0, criadoEm: agora, atualizadoEm: agora };
}

async function criar(dados) {
  const ref = colaboradores().doc(dados.matricula);
  await db.runTransaction(async (transacao) => {
    if ((await transacao.get(ref)).exists) {
      throw conflito('MATRICULA_EM_USO', `Já existe um colaborador com a matrícula ${dados.matricula}.`);
    }
    transacao.set(ref, novoDocumento(dados));
  });
  return docParaJson(await ref.get());
}

async function atualizar(matricula, dados) {
  const ref = colaboradores().doc(matricula);
  const snap = await ref.get();
  if (!snap.exists) throw naoEncontrado('COLABORADOR_NAO_ENCONTRADO', 'Colaborador não encontrado.');
  await ref.update({ ...dados, atualizadoEm: Timestamp.now() });
  return docParaJson(await ref.get());
}

const emLotes = (lista, tamanho) =>
  Array.from({ length: Math.ceil(lista.length / tamanho) }, (_, i) => lista.slice(i * tamanho, (i + 1) * tamanho));

/**
 * Importação em massa. Recebe linhas já validadas ({ linha, matricula, nome, equipe }).
 * Matrícula nova cria o colaborador; matrícula existente atualiza nome e equipe.
 * Nada é desativado nem apagado: quem não está no arquivo continua como está.
 */
async function importar(linhas) {
  const erros = [];
  const porMatricula = new Map();
  for (const item of linhas) {
    const anterior = porMatricula.get(item.matricula);
    if (anterior) {
      erros.push({ linha: item.linha, mensagem: `Matrícula ${item.matricula} repetida (já aparece na linha ${anterior.linha}).` });
    } else {
      porMatricula.set(item.matricula, item);
    }
  }

  const unicos = [...porMatricula.values()];
  const existentes = new Map();
  for (const lote of emLotes(unicos, TAMANHO_LOTE)) {
    const snaps = await db.getAll(...lote.map((item) => colaboradores().doc(item.matricula)));
    snaps.forEach((snap) => snap.exists && existentes.set(snap.id, snap.data()));
  }

  let criados = 0;
  let atualizados = 0;
  let semMudanca = 0;
  for (const lote of emLotes(unicos, TAMANHO_LOTE)) {
    const escrita = db.batch();
    for (const item of lote) {
      const ref = colaboradores().doc(item.matricula);
      const atual = existentes.get(item.matricula);
      if (!atual) {
        escrita.set(ref, novoDocumento(item));
        criados += 1;
      } else if (atual.nome !== item.nome || atual.equipe !== item.equipe) {
        escrita.update(ref, { nome: item.nome, equipe: item.equipe, atualizadoEm: Timestamp.now() });
        atualizados += 1;
      } else {
        semMudanca += 1;
      }
    }
    await escrita.commit();
  }

  erros.sort((a, b) => a.linha - b.linha);
  return { criados, atualizados, semMudanca, erros };
}

module.exports = { listar, buscar, buscarPorBiometria, cadastrarBiometria, criar, atualizar, importar };

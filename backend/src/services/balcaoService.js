const { Timestamp } = require('firebase-admin/firestore');
const { db } = require('../config/firebase');
const { conflito, dadoInvalido, naoEncontrado } = require('../utils/erros');
const { paraJson } = require('../utils/serializar');
const { aplicarDevolucao, semanaDe } = require('./pontuacao');

const col = {
  itens: () => db.collection('itens'),
  ferramentas: () => db.collection('ferramentas'),
  movimentacoes: () => db.collection('movimentacoes'),
  colaboradores: () => db.collection('colaboradores'),
};

const SITUACAO = { disponivel: 'disponível', em_uso: 'em uso', parada: 'parada', manutencao: 'em manutenção' };

// "Parada" é só ferramenta sem uso há muito tempo: continua no almoxarifado e pode sair.
const PODE_SAIR = new Set(['disponivel', 'parada']);

const hojeEmSaoPaulo = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

// Dentro da transação: acha os itens pelo código e, para ferramentas, o documento de `ferramentas`.
async function carregar(tx, codigos) {
  const consultas = await Promise.all(codigos.map((c) => tx.get(col.itens().where('codigo', '==', c).limit(1))));
  const achados = new Map();
  const naoAchados = [];
  consultas.forEach((snap, i) => (snap.empty ? naoAchados.push(codigos[i]) : achados.set(codigos[i], { item: snap.docs[0] })));

  const doTipoFerramenta = [...achados.values()].filter(({ item }) => item.data().tipo === 'ferramenta');
  if (doTipoFerramenta.length > 0) {
    const snaps = await tx.getAll(...doTipoFerramenta.map(({ item }) => col.ferramentas().doc(item.id)));
    doTipoFerramenta.forEach((achado, i) => {
      achado.ferramenta = snaps[i];
    });
  }
  return { achados, naoAchados };
}

function validarColaborador(snap, acao) {
  const colaborador = snap.data();
  if (!colaborador.ativo) {
    throw conflito('COLABORADOR_DESATIVADO', `${colaborador.nome} está desativado e não pode ${acao}.`);
  }
  return { matricula: snap.id, nome: colaborador.nome };
}

async function colaboradorAtivo(tx, matricula, acao) {
  const snap = await tx.get(col.colaboradores().doc(matricula));
  if (!snap.exists || snap.data().excluidoEm) {
    throw naoEncontrado('COLABORADOR_NAO_ENCONTRADO', `Não existe colaborador com a matrícula ${matricula}.`);
  }
  return validarColaborador(snap, acao);
}

// Pela digital (caminho normal) ou pela matrícula (quando a digital não funcionou).
async function identificar(tx, { biometriaId, matricula }, acao) {
  if (!biometriaId) return colaboradorAtivo(tx, matricula, acao);
  const achados = await tx.get(col.colaboradores().where('biometriaId', '==', biometriaId).limit(1));
  const ativos = achados.docs.filter((doc) => !doc.data().excluidoEm);
  if (ativos.length === 0) {
    throw naoEncontrado('DIGITAL_NAO_RECONHECIDA', 'Digital não reconhecida. Tente de novo ou identifique pela matrícula.');
  }
  return validarColaborador(ativos[0], acao);
}

/**
 * Retirada no balcão. Tudo ou nada: se um item não puder sair, nenhum sai e a
 * resposta diz o motivo de cada um. Ferramenta passa a "em uso" (saldo continua 1,
 * ela só está com alguém); consumo baixa o saldo.
 */
async function retirar({ biometriaId, matricula, justificativa, prazoDevolucao, itens }, usuario) {
  if (prazoDevolucao && prazoDevolucao < hojeEmSaoPaulo()) {
    throw dadoInvalido('PRAZO_INVALIDO', 'O prazo de devolução não pode ser uma data que já passou.');
  }

  return db.runTransaction(async (tx) => {
    const colaborador = await identificar(tx, { biometriaId, matricula }, 'retirar');
    const { achados, naoAchados } = await carregar(tx, itens.map((i) => i.codigo));

    const problemas = naoAchados.map((c) => `${c}: código não encontrado.`);
    const planos = [];
    for (const { codigo, quantidade } of itens) {
      const achado = achados.get(codigo);
      if (!achado) continue;
      const item = achado.item.data();
      if (item.excluidoEm) {
        problemas.push(`${codigo}: código não encontrado.`);
      } else if (!item.ativo) {
        problemas.push(`${codigo}: item desativado.`);
      } else if (item.tipo === 'ferramenta') {
        const ferramenta = achado.ferramenta.data();
        if (quantidade !== 1) problemas.push(`${codigo}: ferramenta sai uma por vez (quantidade 1).`);
        else if (ferramenta.status === 'em_uso') problemas.push(`${codigo}: já está em uso por ${ferramenta.colaboradorNome}.`);
        else if (!PODE_SAIR.has(ferramenta.status)) problemas.push(`${codigo}: está ${SITUACAO[ferramenta.status]}.`);
        else planos.push({ codigo, quantidade, achado, item });
      } else if (item.saldo < quantidade) {
        problemas.push(`${codigo}: saldo ${item.saldo}, pedido ${quantidade}.`);
      } else {
        planos.push({ codigo, quantidade, achado, item });
      }
    }
    if (problemas.length > 0) throw conflito('RETIRADA_RECUSADA', `Nada foi retirado. ${problemas.join(' ')}`);

    const agora = Timestamp.now();
    const operacaoId = col.movimentacoes().doc().id;
    for (const { quantidade, achado, item } of planos) {
      if (item.tipo === 'ferramenta') {
        tx.update(col.ferramentas().doc(achado.item.id), {
          status: 'em_uso',
          colaboradorId: colaborador.matricula,
          colaboradorNome: colaborador.nome,
          prazoDevolucao: prazoDevolucao ?? null,
          statusDesde: agora,
        });
        tx.update(achado.item.ref, { ultimaMovimentacao: agora });
      } else {
        tx.update(achado.item.ref, { saldo: item.saldo - quantidade, ultimaMovimentacao: agora });
      }
      tx.set(col.movimentacoes().doc(), {
        operacaoId,
        itemId: achado.item.id,
        itemCodigo: item.codigo,
        itemNome: item.nome,
        tipo: 'retirada',
        quantidade,
        custoUnitario: item.custoMedio,
        documento: 'Balcão',
        origemId: item.localId ?? null,
        destinoId: null,
        colaboradorId: colaborador.matricula,
        colaboradorNome: colaborador.nome,
        identificacao: biometriaId ? 'biometria' : 'matricula',
        justificativa: biometriaId ? null : justificativa,
        prazoDevolucao: item.tipo === 'ferramenta' ? (prazoDevolucao ?? null) : null,
        usuarioId: usuario.uid,
        usuarioNome: usuario.nome,
        data: agora,
        observacao: null,
      });
    }

    return {
      operacaoId,
      colaborador,
      itens: planos.map(({ codigo, quantidade, item }) => ({ codigo, nome: item.nome, quantidade })),
    };
  });
}

/**
 * Devolução no balcão: só ferramentas que estão em uso. Quem devolve pode ser outra
 * pessoa; o responsável pela retirada continua sendo quem a pegou (é dele que o
 * histórico e, depois, os pontos contam).
 */
async function devolver({ codigos, devolvidoPorBiometriaId, devolvidoPorMatricula, justificativa, observacao }, usuario) {
  return db.runTransaction(async (tx) => {
    const identificouQuemDevolveu = Boolean(devolvidoPorBiometriaId || devolvidoPorMatricula);
    const devolvidoPor = identificouQuemDevolveu
      ? await identificar(tx, { biometriaId: devolvidoPorBiometriaId, matricula: devolvidoPorMatricula }, 'devolver')
      : null;
    const { achados, naoAchados } = await carregar(tx, codigos);

    const problemas = naoAchados.map((c) => `${c}: código não encontrado.`);
    const planos = [];
    for (const codigo of codigos) {
      const achado = achados.get(codigo);
      if (!achado) continue;
      const item = achado.item.data();
      if (item.tipo !== 'ferramenta') problemas.push(`${codigo}: é material de consumo, não se devolve.`);
      else if (achado.ferramenta.data().status !== 'em_uso') {
        problemas.push(`${codigo}: não está em uso (está ${SITUACAO[achado.ferramenta.data().status]}).`);
      } else planos.push({ codigo, achado, item, ferramenta: achado.ferramenta.data() });
    }
    if (problemas.length > 0) throw conflito('DEVOLUCAO_RECUSADA', `Nada foi devolvido. ${problemas.join(' ')}`);

    // Leituras dos responsáveis (pontos) antes de qualquer gravação.
    const idsResponsaveis = [...new Set(planos.map((p) => p.ferramenta.colaboradorId).filter(Boolean))];
    const docsResponsaveis = idsResponsaveis.length
      ? await tx.getAll(...idsResponsaveis.map((id) => col.colaboradores().doc(id)))
      : [];
    const responsaveis = new Map(docsResponsaveis.filter((d) => d.exists).map((d) => [d.id, { ref: d.ref, dados: d.data() }]));
    const semana = semanaDe();

    const agora = Timestamp.now();
    const hoje = hojeEmSaoPaulo();
    const operacaoId = col.movimentacoes().doc().id;
    const resultado = [];
    for (const { achado, item, ferramenta } of planos) {
      const noPrazo = ferramenta.prazoDevolucao ? hoje <= ferramenta.prazoDevolucao : null;
      const responsavel = responsaveis.get(ferramenta.colaboradorId);
      let xp = 0;
      if (responsavel) {
        const { ganho, estado } = aplicarDevolucao(responsavel.dados, noPrazo, semana);
        xp = ganho;
        responsavel.dados = { ...responsavel.dados, ...estado };
      }
      tx.update(col.ferramentas().doc(achado.item.id), {
        status: 'disponivel',
        colaboradorId: null,
        colaboradorNome: null,
        prazoDevolucao: null,
        statusDesde: agora,
      });
      tx.update(achado.item.ref, { ultimaMovimentacao: agora });
      tx.set(col.movimentacoes().doc(), {
        operacaoId,
        itemId: achado.item.id,
        itemCodigo: item.codigo,
        itemNome: item.nome,
        tipo: 'devolucao',
        quantidade: 1,
        custoUnitario: item.custoMedio,
        documento: 'Balcão',
        origemId: null,
        destinoId: item.localId ?? null,
        colaboradorId: ferramenta.colaboradorId,
        colaboradorNome: ferramenta.colaboradorNome,
        devolvidoPorId: devolvidoPor?.matricula ?? ferramenta.colaboradorId,
        devolvidoPorNome: devolvidoPor?.nome ?? ferramenta.colaboradorNome,
        identificacao: identificouQuemDevolveu ? (devolvidoPorBiometriaId ? 'biometria' : 'matricula') : null,
        justificativa: identificouQuemDevolveu && !devolvidoPorBiometriaId ? justificativa : null,
        noPrazo,
        xp,
        usuarioId: usuario.uid,
        usuarioNome: usuario.nome,
        data: agora,
        observacao: observacao ?? null,
      });
      resultado.push({ codigo: item.codigo, nome: item.nome, responsavel: ferramenta.colaboradorNome, noPrazo, xp });
    }
    for (const { ref, dados } of responsaveis.values()) {
      const { xp, xpSemana, semanaId, sequencia, melhorSequencia, devolucoesNoPrazo, devolucoesAtrasadas } = dados;
      tx.update(ref, { xp, xpSemana, semanaId, sequencia, melhorSequencia, devolucoesNoPrazo, devolucoesAtrasadas, atualizadoEm: agora });
    }

    return { operacaoId, itens: resultado };
  });
}

// Últimas retiradas e devoluções, da mais nova para a mais antiga.
async function ultimas(limite = 15) {
  const snap = await col
    .movimentacoes()
    .where('tipo', 'in', ['retirada', 'devolucao'])
    .orderBy('data', 'desc')
    .limit(limite)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...paraJson(doc.data()) }));
}

module.exports = { retirar, devolver, ultimas };

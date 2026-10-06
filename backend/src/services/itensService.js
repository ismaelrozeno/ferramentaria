const { Timestamp } = require('firebase-admin/firestore');
const { db } = require('../config/firebase');
const { formatarCodigo, idDoContador } = require('../utils/codigo');
const { conflito, dadoInvalido, naoEncontrado } = require('../utils/erros');
const { paraJson } = require('../utils/serializar');
const { normalizar } = require('../utils/texto');

const col = {
  itens: () => db.collection('itens'),
  ferramentas: () => db.collection('ferramentas'),
  movimentacoes: () => db.collection('movimentacoes'),
  categorias: () => db.collection('categorias'),
  locais: () => db.collection('locais'),
  contadores: () => db.collection('contadores'),
};

const STATUS_LEGIVEL = {
  disponivel: 'disponível',
  em_uso: 'em uso',
  parada: 'parada',
  manutencao: 'em manutenção',
};

// Junta o documento de `itens` com o de `ferramentas` (mesmo ID), quando houver.
function montarItem(itemSnap, ferramentaSnap) {
  return {
    id: itemSnap.id,
    ...paraJson(itemSnap.data()),
    ferramenta: ferramentaSnap?.exists ? paraJson(ferramentaSnap.data()) : null,
  };
}

/**
 * Cadastra o item e gera o código numa única transação: dois cadastros ao
 * mesmo tempo nunca recebem o mesmo número. Ferramenta entra com saldo 1 por
 * uma movimentação de entrada (o saldo nunca é digitado).
 */
async function criar(dados, usuario) {
  if (dados.tipo === 'ferramenta' && dados.origem === 'alocada' && (!dados.fornecedor || !dados.fimContratoLocacao)) {
    throw dadoInvalido('DADOS_INVALIDOS', 'Ferramenta alocada exige o fornecedor e a data de fim do contrato.');
  }

  return db.runTransaction(async (tx) => {
    const categoriaRef = col.categorias().doc(dados.categoriaId);
    const contadorRef = col.contadores().doc(idDoContador(dados.tipo, dados.categoriaId));
    const localRef = dados.localId ? col.locais().doc(dados.localId) : null;

    const [categoria, contador, local] = await tx.getAll(
      ...[categoriaRef, contadorRef, localRef].filter(Boolean),
    );

    if (!categoria.exists) {
      throw dadoInvalido('CATEGORIA_INVALIDA', `A categoria ${dados.categoriaId} não existe.`);
    }
    if (!categoria.data().ativa) {
      throw dadoInvalido('CATEGORIA_INVALIDA', `A categoria ${dados.categoriaId} está desativada.`);
    }
    if (localRef && (!local.exists || !local.data().ativo)) {
      throw dadoInvalido('LOCAL_INVALIDO', 'O local escolhido não existe ou está desativado.');
    }

    const numero = contador.exists ? contador.data().proximo : 1;
    const codigo = formatarCodigo(dados.tipo, dados.categoriaId, numero);
    const agora = Timestamp.now();
    const itemRef = col.itens().doc();
    const ehFerramenta = dados.tipo === 'ferramenta';

    const item = {
      codigo,
      nome: dados.nome,
      nomeBusca: normalizar(`${codigo} ${dados.nome}`),
      tipo: dados.tipo,
      categoriaId: dados.categoriaId,
      unidade: ehFerramenta ? 'un' : dados.unidade,
      saldo: ehFerramenta ? 1 : 0,
      estoqueMinimo: ehFerramenta ? 0 : dados.estoqueMinimo,
      pontoPedido: ehFerramenta ? 0 : dados.pontoPedido,
      estoqueMaximo: ehFerramenta ? 1 : dados.estoqueMaximo,
      custoMedio: ehFerramenta ? dados.valor : 0,
      classeABC: null,
      localId: dados.localId ?? null,
      ultimaMovimentacao: ehFerramenta ? agora : null,
      ativo: true,
      criadoEm: agora,
    };

    tx.set(contadorRef, { proximo: numero + 1 });
    tx.set(itemRef, item);

    if (ehFerramenta) {
      tx.set(col.ferramentas().doc(itemRef.id), {
        marca: dados.marca ?? null,
        modelo: dados.modelo ?? null,
        numeroSerie: dados.numeroSerie ?? null,
        fotoPath: null,
        valor: dados.valor,
        dataAquisicao: dados.dataAquisicao ?? null,
        origem: dados.origem,
        fornecedor: dados.fornecedor ?? null,
        fimContratoLocacao: dados.fimContratoLocacao ?? null,
        status: 'disponivel',
        colaboradorId: null,
        colaboradorNome: null,
        prazoDevolucao: null,
        statusDesde: agora,
      });
      tx.set(col.movimentacoes().doc(), {
        itemId: itemRef.id,
        itemCodigo: codigo,
        itemNome: dados.nome,
        tipo: dados.origem === 'alocada' ? 'entradaAlocada' : 'entrada',
        quantidade: 1,
        custoUnitario: dados.valor,
        documento: 'Cadastro inicial',
        origemId: null,
        destinoId: dados.localId ?? null,
        usuarioId: usuario.uid,
        usuarioNome: usuario.nome,
        data: agora,
        observacao: 'Entrada no cadastro da ferramenta',
      });
    }

    return { itemId: itemRef.id };
  }).then(({ itemId }) => buscar(itemId));
}

async function listar(filtros = {}) {
  const [itensSnap, ferramentasSnap] = await Promise.all([
    col.itens().where('ativo', '==', true).get(),
    col.ferramentas().get(),
  ]);
  const ferramentas = new Map(ferramentasSnap.docs.map((doc) => [doc.id, doc]));
  const busca = normalizar(filtros.busca);

  return itensSnap.docs
    .map((doc) => montarItem(doc, ferramentas.get(doc.id)))
    .filter((item) => !busca || item.nomeBusca.includes(busca))
    .filter((item) => !filtros.tipo || item.tipo === filtros.tipo)
    .filter((item) => !filtros.categoriaId || item.categoriaId === filtros.categoriaId)
    .filter((item) => !filtros.status || item.ferramenta?.status === filtros.status)
    .filter((item) => !filtros.origem || item.ferramenta?.origem === filtros.origem)
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}

async function buscar(id) {
  const [itemSnap, ferramentaSnap, movimentacoesSnap] = await Promise.all([
    col.itens().doc(id).get(),
    col.ferramentas().doc(id).get(),
    col.movimentacoes().where('itemId', '==', id).get(),
  ]);
  if (!itemSnap.exists) throw naoEncontrado('ITEM_NAO_ENCONTRADO', 'Item não encontrado.');

  const historico = movimentacoesSnap.docs
    .map((doc) => ({ id: doc.id, ...paraJson(doc.data()) }))
    .sort((a, b) => b.data.localeCompare(a.data));

  return { ...montarItem(itemSnap, ferramentaSnap), historico };
}

async function buscarPorCodigo(codigo) {
  const snap = await col.itens().where('codigo', '==', codigo.trim().toUpperCase()).limit(1).get();
  if (snap.empty) throw naoEncontrado('ITEM_NAO_ENCONTRADO', `Nenhum item com o código ${codigo}.`);
  return buscar(snap.docs[0].id);
}

async function atualizar(id, dados) {
  await db.runTransaction(async (tx) => {
    const itemRef = col.itens().doc(id);
    const ferramentaRef = col.ferramentas().doc(id);
    const [itemSnap, ferramentaSnap] = await tx.getAll(itemRef, ferramentaRef);
    if (!itemSnap.exists) throw naoEncontrado('ITEM_NAO_ENCONTRADO', 'Item não encontrado.');
    const item = itemSnap.data();

    const camposDoItem = {};
    if (dados.nome) {
      camposDoItem.nome = dados.nome;
      camposDoItem.nomeBusca = normalizar(`${item.codigo} ${dados.nome}`);
    }
    if (dados.localId) camposDoItem.localId = dados.localId;

    if (item.tipo === 'consumo') {
      for (const campo of ['estoqueMinimo', 'pontoPedido', 'estoqueMaximo']) {
        if (dados[campo] !== undefined) camposDoItem[campo] = dados[campo];
      }
    }

    if (item.tipo === 'ferramenta') {
      const camposDaFerramenta = {};
      for (const campo of ['marca', 'modelo', 'numeroSerie', 'valor', 'dataAquisicao', 'fornecedor', 'fimContratoLocacao']) {
        if (dados[campo] !== undefined) camposDaFerramenta[campo] = dados[campo];
      }
      if (dados.valor !== undefined) camposDoItem.custoMedio = dados.valor;
      if (Object.keys(camposDaFerramenta).length && ferramentaSnap.exists) {
        tx.update(ferramentaRef, camposDaFerramenta);
      }
    }

    if (Object.keys(camposDoItem).length) tx.update(itemRef, camposDoItem);
  });
  return buscar(id);
}

// Desativar tira o item do catálogo (cadastro errado ou duplicado).
// Perda ou quebra é "baixa", uma movimentação, e não usa esta função.
async function desativar(id) {
  await db.runTransaction(async (tx) => {
    const itemRef = col.itens().doc(id);
    const ferramentaRef = col.ferramentas().doc(id);
    const [itemSnap, ferramentaSnap] = await tx.getAll(itemRef, ferramentaRef);
    if (!itemSnap.exists) throw naoEncontrado('ITEM_NAO_ENCONTRADO', 'Item não encontrado.');
    const item = itemSnap.data();

    if (item.tipo === 'ferramenta' && ferramentaSnap.data()?.status !== 'disponivel') {
      const status = STATUS_LEGIVEL[ferramentaSnap.data()?.status] ?? 'indisponível';
      throw conflito('ITEM_EM_USO', `A ferramenta está ${status}. Ela precisa estar disponível para ser desativada.`);
    }
    if (item.tipo === 'consumo' && item.saldo > 0) {
      throw conflito('ITEM_COM_SALDO', `O item ainda tem saldo ${item.saldo}. Zere o saldo com uma baixa antes de desativar.`);
    }

    tx.update(itemRef, { ativo: false });
  });
}

module.exports = { criar, listar, buscar, buscarPorCodigo, atualizar, desativar };

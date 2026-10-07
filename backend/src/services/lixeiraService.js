const { Timestamp } = require('firebase-admin/firestore');
const { auth, db } = require('../config/firebase');
const { conflito, naoEncontrado } = require('../utils/erros');
const { paraJson } = require('../utils/serializar');
const configuracoes = require('./configuracoesService');
const { validarRemocaoDeItem } = require('./itensService');

const colecao = (nome) => db.collection(nome);

// Mexer na conta de login não é parte da transação do banco: se a conta já não existir, tudo bem.
async function comConta(acao) {
  try {
    await acao(auth());
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
  }
}

const usaEm = async (tx, colecaoNome, campo, id) => (await tx.get(colecao(colecaoNome).where(campo, '==', id))).docs;

/**
 * Como cada tipo se comporta na lixeira.
 * - validar: bloqueios para enviar à lixeira (lança erro de regra de negócio);
 * - validarDefinitivo: bloqueios para apagar de vez (padrão = validar);
 * - extras: outros documentos que saem junto;
 * - apos*: efeitos fora do banco (conta de login).
 * As movimentações nunca são apagadas: elas guardam código e nome do momento.
 */
const ENTIDADES = {
  itens: {
    colecao: 'itens',
    rotulo: (d) => `${d.codigo} · ${d.nome}`,
    detalhe: (d) => (d.tipo === 'ferramenta' ? 'Ferramenta' : 'Material de consumo'),
    async validar(tx, snap) {
      const item = snap.data();
      const ferramenta = item.tipo === 'ferramenta' ? await tx.get(colecao('ferramentas').doc(snap.id)) : null;
      validarRemocaoDeItem(item, ferramenta?.data(), { participio: 'excluída', infinitivo: 'excluir' });
    },
    extras: (snap) => (snap.data().tipo === 'ferramenta' ? [colecao('ferramentas').doc(snap.id)] : []),
    async validarRestauracao(tx, snap) {
      const { categoriaId, localId } = snap.data();
      const [categoria, local] = await Promise.all([
        tx.get(colecao('categorias').doc(categoriaId)),
        localId ? tx.get(colecao('locais').doc(localId)) : null,
      ]);
      if (!categoria.exists || categoria.data().excluidoEm) {
        throw conflito('CATEGORIA_NA_LIXEIRA', `Restaure antes a categoria ${categoriaId}.`);
      }
      if (local && (!local.exists || local.data().excluidoEm)) {
        throw conflito('LOCAL_NA_LIXEIRA', 'Restaure antes o local deste item.');
      }
    },
  },

  colaboradores: {
    colecao: 'colaboradores',
    maiusculas: true,
    rotulo: (d) => `${d.matricula} · ${d.nome}`,
    detalhe: (d) => d.equipe || 'Colaborador',
    async validar(tx, snap) {
      const comFerramenta = await tx.get(colecao('ferramentas').where('colaboradorId', '==', snap.id).limit(1));
      if (!comFerramenta.empty) {
        throw conflito(
          'COLABORADOR_COM_FERRAMENTA',
          `${snap.data().nome} está com ferramenta em uso. Registre a devolução antes de excluir.`,
        );
      }
    },
  },

  categorias: {
    colecao: 'categorias',
    maiusculas: true,
    rotulo: (d) => `${d.sigla} · ${d.nome}`,
    detalhe: () => 'Categoria',
    async validar(tx, snap) {
      const itens = (await usaEm(tx, 'itens', 'categoriaId', snap.id)).filter((doc) => !doc.data().excluidoEm);
      if (itens.length > 0) {
        throw conflito('CATEGORIA_EM_USO', `Há ${itens.length} item(ns) na categoria ${snap.id}. Exclua ou mude esses itens antes.`);
      }
    },
    async validarDefinitivo(tx, snap) {
      const itens = await usaEm(tx, 'itens', 'categoriaId', snap.id);
      if (itens.length > 0) {
        throw conflito('CATEGORIA_COM_ITENS', `Há ${itens.length} item(ns) (inclusive na lixeira) ligados à categoria ${snap.id}. Apague esses itens antes.`);
      }
    },
  },

  locais: {
    colecao: 'locais',
    rotulo: (d) => d.nome,
    detalhe: (d) => d.tipo ?? 'Local',
    async validar(tx, snap) {
      const itens = (await usaEm(tx, 'itens', 'localId', snap.id)).filter((doc) => !doc.data().excluidoEm);
      if (itens.length > 0) {
        throw conflito('LOCAL_EM_USO', `Há ${itens.length} item(ns) neste local. Mude o local desses itens antes.`);
      }
    },
    async validarDefinitivo(tx, snap) {
      const itens = await usaEm(tx, 'itens', 'localId', snap.id);
      if (itens.length > 0) {
        throw conflito('LOCAL_COM_ITENS', `Há ${itens.length} item(ns) (inclusive na lixeira) ligados a este local. Apague esses itens antes.`);
      }
    },
  },

  usuarios: {
    colecao: 'usuarios',
    rotulo: (d) => d.nome,
    detalhe: (d) => `${d.email} · ${d.perfil === 'admin' ? 'Administrador' : 'Almoxarife'}`,
    async validar(tx, snap, quem) {
      if (snap.id === quem.uid) throw conflito('USUARIO_PROPRIO', 'Você não pode excluir a sua própria conta.');
      if (snap.data().perfil === 'admin') {
        const admins = await usaEm(tx, 'usuarios', 'perfil', 'admin');
        const outros = admins.filter((doc) => doc.id !== snap.id && doc.data().ativo && !doc.data().excluidoEm);
        if (outros.length === 0) throw conflito('ULTIMO_ADMIN', 'Este é o último administrador ativo. Crie outro antes de excluir.');
      }
    },
    aposLixeira: (id) =>
      comConta(async (autenticacao) => {
        await autenticacao.updateUser(id, { disabled: true });
        await autenticacao.revokeRefreshTokens(id);
      }),
    aposRestaurar: (id, dados) => comConta((autenticacao) => autenticacao.updateUser(id, { disabled: !dados.ativo })),
    aposApagar: (id) => comConta((autenticacao) => autenticacao.deleteUser(id)),
  },
};

function entidade(tipo, idBruto) {
  const e = ENTIDADES[tipo];
  if (!e) throw naoEncontrado('TIPO_INVALIDO', `Tipo desconhecido: ${tipo}.`);
  const id = e.maiusculas ? idBruto.toUpperCase() : idBruto;
  return { e, id, ref: colecao(e.colecao).doc(id) };
}

const existente = async (tx, ref) => {
  const snap = await tx.get(ref);
  if (!snap.exists) throw naoEncontrado('NAO_ENCONTRADO', 'Registro não encontrado.');
  return snap;
};

const apagarDocumentos = (tx, e, snap) => {
  tx.delete(snap.ref);
  e.extras?.(snap).forEach((extra) => tx.delete(extra));
};

/**
 * Excluir: com a lixeira ligada o registro só some das telas e pode ser restaurado;
 * com ela desligada é apagado de vez. O resultado diz qual dos dois aconteceu.
 */
async function excluir(tipo, idBruto, quem) {
  const { e, id, ref } = entidade(tipo, idBruto);
  const { lixeiraAtiva } = await configuracoes.obter();

  await db.runTransaction(async (tx) => {
    const snap = await existente(tx, ref);
    if (snap.data().excluidoEm) throw conflito('JA_NA_LIXEIRA', 'Este registro já está na lixeira.');
    await (lixeiraAtiva ? e.validar : (e.validarDefinitivo ?? e.validar))(tx, snap, quem);
    if (lixeiraAtiva) {
      tx.update(ref, { excluidoEm: Timestamp.now(), excluidoPor: quem.uid, excluidoPorNome: quem.nome });
    } else {
      apagarDocumentos(tx, e, snap);
    }
  });

  await (lixeiraAtiva ? e.aposLixeira : e.aposApagar)?.(id);
  return { resultado: lixeiraAtiva ? 'lixeira' : 'apagado', tipo, id };
}

async function restaurar(tipo, idBruto) {
  const { e, id, ref } = entidade(tipo, idBruto);
  let dados;
  await db.runTransaction(async (tx) => {
    const snap = await existente(tx, ref);
    if (!snap.data().excluidoEm) throw conflito('FORA_DA_LIXEIRA', 'Este registro não está na lixeira.');
    await e.validarRestauracao?.(tx, snap);
    dados = snap.data();
    tx.update(ref, { excluidoEm: null, excluidoPor: null, excluidoPorNome: null });
  });
  await e.aposRestaurar?.(id, dados);
  return { resultado: 'restaurado', tipo, id };
}

async function apagarDeVez(tipo, idBruto, quem) {
  const { e, id, ref } = entidade(tipo, idBruto);
  await db.runTransaction(async (tx) => {
    const snap = await existente(tx, ref);
    if (!snap.data().excluidoEm) {
      throw conflito('NAO_ESTA_NA_LIXEIRA', 'Só dá para apagar de vez o que já está na lixeira.');
    }
    await (e.validarDefinitivo ?? e.validar)(tx, snap, quem);
    apagarDocumentos(tx, e, snap);
  });
  await e.aposApagar?.(id);
  return { resultado: 'apagado', tipo, id };
}

// Tudo o que está na lixeira, por tipo, do mais recente para o mais antigo.
async function listar() {
  const tipos = Object.entries(ENTIDADES);
  const grupos = await Promise.all(
    tipos.map(([, e]) => colecao(e.colecao).where('excluidoEm', '!=', null).get()),
  );
  return Object.fromEntries(
    tipos.map(([tipo, e], i) => [
      tipo,
      grupos[i].docs
        .map((doc) => {
          const d = paraJson(doc.data());
          return {
            id: doc.id,
            rotulo: e.rotulo(d),
            detalhe: e.detalhe(d),
            excluidoEm: d.excluidoEm,
            excluidoPorNome: d.excluidoPorNome ?? null,
          };
        })
        .sort((a, b) => b.excluidoEm.localeCompare(a.excluidoEm)),
    ]),
  );
}

module.exports = { excluir, restaurar, apagarDeVez, listar };

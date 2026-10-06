const { db } = require('../src/config/firebase');
const {
  api,
  cliente,
  estado,
  prepararBanco,
  criarConta,
  criarUsuario,
  criarCategoria,
  ferramentaValida,
} = require('./ajuda');

beforeEach(prepararBanco);

describe('Login', () => {
  it('recusa requisição sem token', async () => {
    const res = await cliente(null).get('/api/itens');

    expect(res.status).toBe(401);
    expect(res.body.erro).toBe('NAO_AUTENTICADO');
  });

  it('recusa token inválido', async () => {
    const res = await cliente('token-falso').get('/api/itens');

    expect(res.status).toBe(401);
    expect(res.body.erro).toBe('SESSAO_INVALIDA');
  });

  it('recusa conta de login sem cadastro no FERRUM', async () => {
    const { token } = await criarConta('estranho@teste.local');
    const res = await cliente(token).get('/api/me');

    expect(res.status).toBe(403);
    expect(res.body.erro).toBe('SEM_CADASTRO');
  });

  it('recusa usuário desativado', async () => {
    const { token } = await criarUsuario('almoxarife', { ativo: false });
    const res = await cliente(token).get('/api/me');

    expect(res.status).toBe(403);
    expect(res.body.erro).toBe('USUARIO_DESATIVADO');
  });

  it('devolve nome e perfil do usuário logado em /me', async () => {
    const res = await api().get('/api/me');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ uid: estado.uidAdmin, nome: 'Administrador (teste)', perfil: 'admin' });
  });

  it('/health continua público', async () => {
    const res = await cliente(null).get('/api/health');

    expect(res.status).toBe(200);
  });
});

describe('Permissões do almoxarife', () => {
  it('consulta o catálogo, mas não cadastra item nem categoria', async () => {
    await criarCategoria();
    const { token } = await criarUsuario('almoxarife');
    const almoxarife = cliente(token);

    const catalogo = await almoxarife.get('/api/itens');
    const item = await almoxarife.post('/api/itens').send(ferramentaValida());
    const categoria = await almoxarife.post('/api/categorias').send({ sigla: 'MAN', nome: 'Manuais' });

    expect(catalogo.status).toBe(200);
    expect(item.status).toBe(403);
    expect(item.body.erro).toBe('SEM_PERMISSAO');
    expect(categoria.status).toBe(403);
  });

  it('não acessa a gestão de usuários', async () => {
    const { token } = await criarUsuario('almoxarife');
    const res = await cliente(token).get('/api/usuarios');

    expect(res.status).toBe(403);
  });
});

describe('Gestão de usuários (administrador)', () => {
  const novo = { nome: 'Maria Almoxarife', email: 'Maria@Empresa.com', perfil: 'almoxarife', senha: 'senha-inicial-1' };

  it('cria usuário que já consegue entrar com a senha inicial', async () => {
    const res = await api().post('/api/usuarios').send(novo);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nome: 'Maria Almoxarife', email: 'maria@empresa.com', perfil: 'almoxarife', ativo: true });

    const login = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=chave-de-teste`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'maria@empresa.com', password: 'senha-inicial-1', returnSecureToken: true }),
      },
    );
    const { idToken } = await login.json();
    const me = await cliente(idToken).get('/api/me');
    expect(me.body.perfil).toBe('almoxarife');
  });

  it('recusa e-mail repetido e senha curta', async () => {
    await api().post('/api/usuarios').send(novo);
    const repetido = await api().post('/api/usuarios').send(novo);
    const senhaCurta = await api().post('/api/usuarios').send({ ...novo, email: 'outra@empresa.com', senha: '123' });

    expect(repetido.status).toBe(409);
    expect(repetido.body.erro).toBe('EMAIL_EM_USO');
    expect(senhaCurta.status).toBe(400);
    expect(senhaCurta.body.mensagem).toMatch(/8 caracteres/);
  });

  it('desativa um usuário, que perde o acesso na hora', async () => {
    const { uid, token } = await criarUsuario('almoxarife');
    const res = await api().patch(`/api/usuarios/${uid}`).send({ ativo: false });
    const depois = await cliente(token).get('/api/me');

    expect(res.status).toBe(200);
    // A conta de login também é desativada: o token já é recusado (401) ou o cadastro (403).
    expect([401, 403]).toContain(depois.status);
  });

  it('não deixa o administrador tirar o próprio acesso', async () => {
    const desativar = await api().patch(`/api/usuarios/${estado.uidAdmin}`).send({ ativo: false });
    const rebaixar = await api().patch(`/api/usuarios/${estado.uidAdmin}`).send({ perfil: 'almoxarife' });

    expect(desativar.status).toBe(409);
    expect(rebaixar.status).toBe(409);
    expect(desativar.body.erro).toBe('ALTERACAO_PROPRIA');
  });
});

describe('Primeiro administrador em produção (ADMIN_INICIAL_UID)', () => {
  afterEach(() => {
    delete process.env.ADMIN_INICIAL_UID;
  });

  it('vira administrador no primeiro acesso só se o UID for o configurado', async () => {
    const escolhido = await criarConta('dono@empresa.com');
    const outro = await criarConta('outro@empresa.com');
    process.env.ADMIN_INICIAL_UID = escolhido.uid;

    const resOutro = await cliente(outro.token).get('/api/me');
    const resEscolhido = await cliente(escolhido.token).get('/api/me');
    const cadastro = await db.collection('usuarios').doc(escolhido.uid).get();

    expect(resOutro.status).toBe(403);
    expect(resEscolhido.status).toBe(200);
    expect(resEscolhido.body.perfil).toBe('admin');
    expect(cadastro.data()).toMatchObject({ email: 'dono@empresa.com', perfil: 'admin', ativo: true });
  });
});

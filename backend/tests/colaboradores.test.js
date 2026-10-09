const { api, cliente, criarUsuario, prepararBanco } = require('./ajuda');

beforeEach(prepararBanco);

const maria = { matricula: '1001', nome: 'Maria Souza', equipe: 'Elétrica' };

describe('Cadastro de colaborador', () => {
  it('cria o colaborador com a matrícula como identificador, sem login e sem pontos', async () => {
    const res = await api().post('/api/colaboradores').send({ ...maria, matricula: 'ab-12' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 'AB-12',
      matricula: 'AB-12',
      nome: 'Maria Souza',
      equipe: 'Elétrica',
      ativo: true,
      biometriaId: null,
      xp: 0,
    });
  });

  it('cadastro manual guarda função e mão de obra (ou nada, se não informadas)', async () => {
    const completo = await api()
      .post('/api/colaboradores')
      .send({ ...maria, funcao: 'Eletricista', maoDeObra: 'direta' });
    const simples = await api().post('/api/colaboradores').send({ matricula: '1002', nome: 'João Lima', maoDeObra: null });
    const errado = await api().post('/api/colaboradores').send({ matricula: '1003', nome: 'Ana', maoDeObra: 'terceira' });

    expect(completo.body).toMatchObject({ funcao: 'Eletricista', maoDeObra: 'direta', ativo: true });
    expect(simples.body).toMatchObject({ funcao: '', maoDeObra: null, equipe: '' });
    expect(errado.status).toBe(400);
  });

  it('não repete matrícula', async () => {
    await api().post('/api/colaboradores').send(maria);
    const repetido = await api().post('/api/colaboradores').send({ ...maria, nome: 'Outra Pessoa' });

    expect(repetido.status).toBe(409);
    expect(repetido.body.erro).toBe('MATRICULA_EM_USO');
  });

  it('recusa matrícula com barra ou nome vazio', async () => {
    const res = await api().post('/api/colaboradores').send({ matricula: 'a/b', nome: '' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('DADOS_INVALIDOS');
    expect(res.body.campos.map((c) => c.campo).sort()).toEqual(['matricula', 'nome']);
  });

  it('lista em ordem de nome', async () => {
    await api().post('/api/colaboradores').send({ matricula: '2', nome: 'Zélia' });
    await api().post('/api/colaboradores').send({ matricula: '1', nome: 'Ana' });

    const res = await api().get('/api/colaboradores');

    expect(res.body.map((c) => c.nome)).toEqual(['Ana', 'Zélia']);
  });

  it('altera nome, equipe e desativa, mas não deixa mudar a matrícula', async () => {
    await api().post('/api/colaboradores').send(maria);

    const res = await api().patch('/api/colaboradores/1001').send({ nome: 'Maria S. Lima', ativo: false });
    const proibido = await api().patch('/api/colaboradores/1001').send({ matricula: '9999' });

    expect(res.body).toMatchObject({ nome: 'Maria S. Lima', equipe: 'Elétrica', ativo: false });
    expect(proibido.status).toBe(400);
  });

  it('devolve 404 ao alterar matrícula que não existe', async () => {
    const res = await api().patch('/api/colaboradores/404').send({ ativo: false });

    expect(res.status).toBe(404);
  });

  it('almoxarife consulta a lista, mas não cadastra nem importa', async () => {
    const almoxarife = await criarUsuario('almoxarife');
    const como = cliente(almoxarife.token);

    expect((await como.get('/api/colaboradores')).status).toBe(200);
    expect((await como.post('/api/colaboradores').send(maria)).status).toBe(403);
    expect((await como.post('/api/colaboradores/importacao').send({ linhas: [maria] })).status).toBe(403);
  });
});

describe('Importação de colaboradores', () => {
  it('cria os novos e conta cada um', async () => {
    const res = await api()
      .post('/api/colaboradores/importacao')
      .send({ linhas: [maria, { matricula: '1002', nome: 'João Lima' }] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ criados: 2, atualizados: 0, semMudanca: 0, erros: [] });
    const lista = await api().get('/api/colaboradores');
    expect(lista.body.find((c) => c.matricula === '1002')).toMatchObject({ equipe: '', ativo: true, xp: 0 });
  });

  it('importar o mesmo arquivo de novo não muda nada', async () => {
    const linhas = [maria, { matricula: '1002', nome: 'João Lima', equipe: 'Obra' }];
    await api().post('/api/colaboradores/importacao').send({ linhas });

    const segunda = await api().post('/api/colaboradores/importacao').send({ linhas });

    expect(segunda.body).toMatchObject({ criados: 0, atualizados: 0, semMudanca: 2 });
  });

  it('atualiza nome e equipe de matrícula existente, sem mexer em ativo nem pontos', async () => {
    await api().post('/api/colaboradores').send(maria);
    await api().patch('/api/colaboradores/1001').send({ ativo: false });

    const res = await api()
      .post('/api/colaboradores/importacao')
      .send({ linhas: [{ matricula: '1001', nome: 'Maria Souza Lima', equipe: 'Manutenção' }] });

    expect(res.body).toMatchObject({ criados: 0, atualizados: 1 });
    const lista = await api().get('/api/colaboradores');
    expect(lista.body[0]).toMatchObject({ nome: 'Maria Souza Lima', equipe: 'Manutenção', ativo: false, xp: 0 });
  });

  it('linhas ruins voltam no relatório com o número da linha; as boas entram', async () => {
    const res = await api()
      .post('/api/colaboradores/importacao')
      .send({
        linhas: [
          { linha: 2, ...maria },
          { linha: 3, matricula: '', nome: 'Sem Matrícula' },
          { linha: 4, matricula: '1003', nome: '' },
          { linha: 5, matricula: '1004', nome: 'Pedro Alves' },
        ],
      });

    expect(res.body.criados).toBe(2);
    expect(res.body.erros.map((e) => e.linha)).toEqual([3, 4]);
    expect(res.body.erros[0].mensagem).toMatch(/matrícula/i);
  });

  it('matrícula repetida no arquivo: vale a primeira linha, a outra vira erro', async () => {
    const res = await api()
      .post('/api/colaboradores/importacao')
      .send({
        linhas: [
          { linha: 2, ...maria },
          { linha: 3, matricula: '1001', nome: 'Outra Pessoa' },
        ],
      });

    expect(res.body.criados).toBe(1);
    expect(res.body.erros).toEqual([{ linha: 3, mensagem: expect.stringContaining('linha 2') }]);
    const lista = await api().get('/api/colaboradores');
    expect(lista.body[0].nome).toBe('Maria Souza');
  });

  it('traz função, mão de obra e situação da planilha (inativo já entra desativado)', async () => {
    const res = await api()
      .post('/api/colaboradores/importacao')
      .send({
        linhas: [
          { ...maria, funcao: 'Eletricista', maoDeObra: 'direta', ativo: true },
          { matricula: '1002', nome: 'João Lima', funcao: 'Analista', maoDeObra: 'indireta', ativo: false },
        ],
      });

    expect(res.body).toMatchObject({ criados: 2, erros: [] });
    const lista = (await api().get('/api/colaboradores')).body;
    expect(lista.find((c) => c.matricula === '1001')).toMatchObject({ funcao: 'Eletricista', maoDeObra: 'direta', ativo: true });
    expect(lista.find((c) => c.matricula === '1002')).toMatchObject({ funcao: 'Analista', maoDeObra: 'indireta', ativo: false });
  });

  it('situação "inativo" na planilha desativa quem já existe; coluna ausente não apaga função nem equipe', async () => {
    await api().post('/api/colaboradores').send({ ...maria, funcao: 'Eletricista' });

    const desativa = await api()
      .post('/api/colaboradores/importacao')
      .send({ linhas: [{ matricula: '1001', nome: 'Maria Souza', ativo: false }] });

    expect(desativa.body).toMatchObject({ atualizados: 1 });
    const [colaborador] = (await api().get('/api/colaboradores')).body;
    expect(colaborador).toMatchObject({ ativo: false, equipe: 'Elétrica', funcao: 'Eletricista' });
  });

  it('situação ou mão de obra com valor estranho viram erro da linha', async () => {
    const res = await api()
      .post('/api/colaboradores/importacao')
      .send({
        linhas: [
          { linha: 2, ...maria, ativo: 'talvez' },
          { linha: 3, matricula: '1002', nome: 'João Lima', maoDeObra: 'terceirizada' },
        ],
      });

    expect(res.body.criados).toBe(0);
    expect(res.body.erros).toEqual([
      { linha: 2, mensagem: expect.stringMatching(/situação/i) },
      { linha: 3, mensagem: expect.stringMatching(/mão de obra/i) },
    ]);
  });

  it('importa mais de 400 de uma vez (vários lotes)', async () => {
    const linhas = Array.from({ length: 650 }, (_, i) => ({ matricula: `M${i + 1}`, nome: `Pessoa ${i + 1}` }));

    const res = await api().post('/api/colaboradores/importacao').send({ linhas });

    expect(res.body).toMatchObject({ criados: 650, erros: [] });
    expect((await api().get('/api/colaboradores')).body).toHaveLength(650);
  });

  it('recusa arquivo vazio e mais de 2000 linhas', async () => {
    const vazio = await api().post('/api/colaboradores/importacao').send({ linhas: [] });
    const demais = await api()
      .post('/api/colaboradores/importacao')
      .send({ linhas: Array.from({ length: 2001 }, () => ({})) });

    expect(vazio.status).toBe(400);
    expect(demais.status).toBe(400);
  });
});

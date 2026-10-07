const { Router } = require('express');
const apoio = require('../controllers/cadastrosDeApoioController');
const balcao = require('../controllers/balcaoController');
const colaboradores = require('../controllers/colaboradoresController');
const healthController = require('../controllers/healthController');
const ranking = require('../controllers/rankingController');
const itens = require('../controllers/itensController');
const usuarios = require('../controllers/usuariosController');
const { autenticar, exigirPerfil } = require('../middlewares/autenticacao');

const router = Router();
const somenteAdmin = exigirPerfil('admin');

router.get('/health', healthController.check);

// Painel do ranking para telas fixas: não exige login.
router.get('/painel', ranking.painel);

// Daqui para baixo, toda rota exige login.
router.use(autenticar);

router.get('/me', (req, res) => res.json(req.usuario));
router.patch('/me/preferencias', usuarios.atualizarPreferencias);

router.get('/usuarios', somenteAdmin, usuarios.listar);
router.post('/usuarios', somenteAdmin, usuarios.criar);
router.patch('/usuarios/:uid', somenteAdmin, usuarios.atualizar);

router.get('/categorias', apoio.listarCategorias);
router.post('/categorias', somenteAdmin, apoio.criarCategoria);
router.patch('/categorias/:sigla', somenteAdmin, apoio.atualizarCategoria);

router.get('/locais', apoio.listarLocais);
router.post('/locais', somenteAdmin, apoio.criarLocal);
router.patch('/locais/:id', somenteAdmin, apoio.atualizarLocal);

router.get('/colaboradores', colaboradores.listar);
router.get('/colaboradores/:matricula', colaboradores.buscar);
router.post('/colaboradores', somenteAdmin, colaboradores.criar);
router.post('/colaboradores/importacao', somenteAdmin, colaboradores.importar);
router.patch('/colaboradores/:matricula', somenteAdmin, colaboradores.atualizar);
router.put('/colaboradores/:matricula/biometria', somenteAdmin, colaboradores.cadastrarBiometria);

router.get('/itens', itens.listar);
router.get('/itens/codigo/:codigo', itens.buscarPorCodigo);
router.get('/itens/:id', itens.buscar);
router.post('/itens', somenteAdmin, itens.criar);
router.patch('/itens/:id', somenteAdmin, itens.atualizar);
router.delete('/itens/:id', somenteAdmin, itens.desativar);

router.get('/ranking', ranking.ranking);
router.get('/balcao/ultimas', balcao.ultimas);
router.post('/balcao/identificacao', balcao.identificar);
router.post('/balcao/retiradas', balcao.retirar);
router.post('/balcao/devolucoes', balcao.devolver);

module.exports = router;

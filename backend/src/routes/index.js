const { Router } = require('express');
const apoio = require('../controllers/cadastrosDeApoioController');
const healthController = require('../controllers/healthController');
const itens = require('../controllers/itensController');
const { autenticar, exigirPerfil } = require('../middlewares/autenticacao');

const router = Router();
const somenteAdmin = exigirPerfil('admin');

router.get('/health', healthController.check);

// Daqui para baixo, toda rota exige login.
router.use(autenticar);

router.get('/me', (req, res) => res.json(req.usuario));

router.get('/categorias', apoio.listarCategorias);
router.post('/categorias', somenteAdmin, apoio.criarCategoria);
router.patch('/categorias/:sigla', somenteAdmin, apoio.atualizarCategoria);

router.get('/locais', apoio.listarLocais);
router.post('/locais', somenteAdmin, apoio.criarLocal);
router.patch('/locais/:id', somenteAdmin, apoio.atualizarLocal);

router.get('/itens', itens.listar);
router.get('/itens/codigo/:codigo', itens.buscarPorCodigo);
router.get('/itens/:id', itens.buscar);
router.post('/itens', somenteAdmin, itens.criar);
router.patch('/itens/:id', somenteAdmin, itens.atualizar);
router.delete('/itens/:id', somenteAdmin, itens.desativar);

module.exports = router;

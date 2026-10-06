const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { rotaNaoEncontrada, tratarErros } = require('./middlewares/erros');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/api', routes);
app.use(rotaNaoEncontrada);
app.use(tratarErros);

module.exports = app;

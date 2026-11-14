// src/server.js
// Cria o app Express, registra os middlewares e as rotas.
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.routes.js';
import { rotaNaoEncontrada, tratarErros } from './middlewares/tratarErros.js';

const app = express();

// CORS restrito à origem do front-end (porta 5173)
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));

// Interpreta JSON no corpo da requisição (limite pequeno: a API só recebe formulários)
app.use(express.json({ limit: '100kb' }));

// Rotas da API
app.get('/api', (req, res) => res.json({ api: 'coIN', status: 'ok' }));
app.use('/api/auth', authRoutes);

// 404 e tratamento de erros centralizado (sempre por último)
app.use(rotaNaoEncontrada);
app.use(tratarErros);

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`API coIN rodando em http://localhost:${PORT}`);
});

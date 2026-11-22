// src/routes/saudeFinanceira.routes.js
// Desafio: indicadores, projeção e dicas calculados a partir dos dados do próprio usuário.
import express from 'express';
import SaudeFinanceira from '../models/SaudeFinanceira.js';
import { ErroApi } from '../middlewares/tratarErros.js';

const router = express.Router();

const AVISO = 'As informações desta página são educativas e não constituem recomendação financeira profissional.';

// GET /api/saude-financeira?meses=3 → 200, 400
router.get('/', async (req, res, next) => {
  try {
    const meses = req.query.meses === undefined ? 3 : Number(req.query.meses);
    if (![3, 6].includes(meses)) {
      throw new ErroApi(400, 'Dados inválidos.', { meses: 'Use 3 ou 6 meses.' });
    }
    const saude = await SaudeFinanceira.calcular(req.usuarioId, { meses });
    return res.status(200).json({ aviso: AVISO, ...saude });
  } catch (erro) {
    return next(erro);
  }
});

export default router;

// src/routes/relatorios.routes.js
// Relatórios do usuário logado (RF7, RF8, RF9). Os totais vêm agregados do banco.
import express from 'express';
import Relatorio from '../models/Relatorio.js';
import { lerPeriodo } from '../middlewares/validar.js';
import { periodoAnterior } from '../models/regras/datas.js';

const router = express.Router();

// GET /api/relatorios/categorias?inicio=&fim= → 200, 400
// Saídas e entradas por categoria, com percentual e comparação com o período anterior de mesmo tamanho.
router.get('/categorias', lerPeriodo, async (req, res, next) => {
  try {
    const anterior = periodoAnterior(req.periodo.inicio, req.periodo.fim);
    const { saidas, entradas } = await Relatorio.porCategoria(req.usuarioId, req.periodo, anterior);
    return res.status(200).json({
      periodo: req.periodo,
      periodoAnterior: anterior,
      totalSaidas: saidas.total,
      totalSaidasAnterior: saidas.totalAnterior,
      totalEntradas: entradas.total,
      categorias: saidas.categorias,
      entradas: entradas.categorias,
    });
  } catch (erro) {
    return next(erro);
  }
});

// GET /api/relatorios/fontes-destinos?inicio=&fim= → 200, 400
// Entradas por fonte, saídas por destino e saldo (entradas − saídas) das fontes do tipo conta.
router.get('/fontes-destinos', lerPeriodo, async (req, res, next) => {
  try {
    const relatorio = await Relatorio.porFonteDestino(req.usuarioId, req.periodo);
    return res.status(200).json({ periodo: req.periodo, ...relatorio });
  } catch (erro) {
    return next(erro);
  }
});

export default router;

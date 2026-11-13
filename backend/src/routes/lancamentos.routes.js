// src/routes/lancamentos.routes.js
// CRUD de lançamentos, com filtros, paginação, totais e parcelamento no cartão.
import express from 'express';
import Lancamento from '../models/Lancamento.js';
import Categoria from '../models/Categoria.js';
import FonteDestino from '../models/FonteDestino.js';
import { ErroApi } from '../middlewares/tratarErros.js';
import { lerFiltrosLancamentos, lerPeriodo, validarId, validarLancamento } from '../middlewares/validar.js';

const router = express.Router();

// Regras que dependem do banco: categoria e fonte/destino devem ser do usuário,
// o tipo da categoria deve ser igual ao do lançamento e só cartão aceita parcelas.
async function verificarRegras(usuarioId, dados, { permitirParcelas }) {
  const [categoria, fonte] = await Promise.all([
    Categoria.buscarPorId(usuarioId, dados.categoriaId),
    FonteDestino.buscarPorId(usuarioId, dados.fonteDestinoId),
  ]);

  // Categoria/fonte de outro usuário "não existe" para este usuário → 404
  if (!categoria) throw new ErroApi(404, 'Categoria não encontrada.', { categoriaId: 'Categoria não encontrada.' });
  if (!fonte) throw new ErroApi(404, 'Fonte/destino não encontrado.', { fonteDestinoId: 'Fonte/destino não encontrado.' });

  const campos = {};
  if (categoria.tipo !== dados.tipo) {
    const nome = (t) => (t === 'entrada' ? 'entrada' : 'saída');
    campos.categoriaId = `A categoria informada é de ${nome(categoria.tipo)}, mas o lançamento é de ${nome(dados.tipo)}.`;
  }
  if (permitirParcelas && dados.parcelas > 1 && (fonte.tipo !== 'cartao_credito' || dados.tipo !== 'saida')) {
    campos.parcelas = 'O parcelamento só é permitido em saídas no cartão de crédito.';
  }
  if (Object.keys(campos).length) throw new ErroApi(400, 'Dados inválidos.', campos);
}

// GET /api/lancamentos?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&pagina=&porPagina= → 200, 400
router.get('/', lerPeriodo, lerFiltrosLancamentos, async (req, res, next) => {
  try {
    const { pagina, porPagina, inicio, fim } = req.filtros;
    const { itens, quantidade, totais } = await Lancamento.listar(req.usuarioId, req.filtros);
    return res.status(200).json({
      periodo: { inicio, fim },
      pagina,
      porPagina,
      quantidade,
      totalPaginas: Math.max(1, Math.ceil(quantidade / porPagina)),
      totais,
      itens,
    });
  } catch (erro) {
    return next(erro);
  }
});

// POST /api/lancamentos → 201 (com todas as parcelas criadas), 400, 404
router.post('/', validarLancamento, async (req, res, next) => {
  try {
    await verificarRegras(req.usuarioId, req.dados, { permitirParcelas: true });
    const criados = await Lancamento.inserir(req.usuarioId, req.dados);
    return res.status(201).json({ quantidade: criados.length, itens: criados });
  } catch (erro) {
    return next(erro);
  }
});

// GET /api/lancamentos/:id → 200, 404
router.get('/:id', validarId, async (req, res, next) => {
  try {
    const lancamento = await Lancamento.buscarPorId(req.usuarioId, req.idRecurso);
    if (!lancamento) throw new ErroApi(404, 'Lançamento não encontrado.');
    return res.status(200).json(lancamento);
  } catch (erro) {
    return next(erro);
  }
});

// PUT /api/lancamentos/:id → 200, 400, 404 (mesmas validações da inserção)
router.put('/:id', validarId, validarLancamento, async (req, res, next) => {
  try {
    const atual = await Lancamento.buscarPorId(req.usuarioId, req.idRecurso);
    if (!atual) throw new ErroApi(404, 'Lançamento não encontrado.');

    await verificarRegras(req.usuarioId, req.dados, { permitirParcelas: false });
    // Uma parcela precisa continuar num cartão de crédito
    if (atual.total_parcelas > 1) {
      const fonte = await FonteDestino.buscarPorId(req.usuarioId, req.dados.fonteDestinoId);
      if (fonte.tipo !== 'cartao_credito' || req.dados.tipo !== 'saida') {
        throw new ErroApi(400, 'Dados inválidos.', {
          fonteDestinoId: 'Uma parcela precisa continuar sendo uma saída no cartão de crédito.',
        });
      }
    }

    const lancamento = await Lancamento.atualizar(req.usuarioId, req.idRecurso, req.dados);
    return res.status(200).json(lancamento);
  } catch (erro) {
    return next(erro);
  }
});

// DELETE /api/lancamentos/:id?todasParcelas=true → 204, 404
router.delete('/:id', validarId, async (req, res, next) => {
  try {
    const removidos = await Lancamento.remover(req.usuarioId, req.idRecurso, req.query.todasParcelas === 'true');
    if (removidos === 0) throw new ErroApi(404, 'Lançamento não encontrado.');
    return res.status(204).end();
  } catch (erro) {
    return next(erro);
  }
});

export default router;

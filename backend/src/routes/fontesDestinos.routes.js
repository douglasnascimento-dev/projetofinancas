// src/routes/fontesDestinos.routes.js
// CRUD de fontes e destinos (renda, conta, cartão de crédito) do usuário logado.
import express from 'express';
import FonteDestino from '../models/FonteDestino.js';
import { ErroApi } from '../middlewares/tratarErros.js';
import { validarFonteDestino, validarId } from '../middlewares/validar.js';

const router = express.Router();

const erroNomeDuplicado = () => new ErroApi(409, 'Fonte/destino já cadastrado.', {
  nome: 'Já existe uma fonte/destino com este nome.',
});

// GET /api/fontes-destinos → 200
router.get('/', async (req, res, next) => {
  try {
    return res.status(200).json(await FonteDestino.listar(req.usuarioId));
  } catch (erro) {
    return next(erro);
  }
});

// POST /api/fontes-destinos → 201, 400, 409
router.post('/', validarFonteDestino, async (req, res, next) => {
  try {
    const fonte = await FonteDestino.inserir(req.usuarioId, req.dados);
    return res.status(201).json(fonte);
  } catch (erro) {
    if (erro.code === '23505') return next(erroNomeDuplicado());
    return next(erro);
  }
});

// PUT /api/fontes-destinos/:id → 200, 400, 404, 409
router.put('/:id', validarId, validarFonteDestino, async (req, res, next) => {
  try {
    const atual = await FonteDestino.buscarPorId(req.usuarioId, req.idRecurso);
    if (!atual) throw new ErroApi(404, 'Fonte/destino não encontrado.');

    // Deixar de ser cartão quebraria o parcelamento dos lançamentos já feitos nele
    if (atual.tipo === 'cartao_credito' && req.dados.tipo !== 'cartao_credito'
        && await FonteDestino.contarLancamentos(req.usuarioId, atual.id) > 0) {
      throw new ErroApi(409, 'Não é possível mudar o tipo.', {
        tipo: 'Este cartão já tem lançamentos; ele não pode deixar de ser cartão de crédito.',
      });
    }

    const fonte = await FonteDestino.atualizar(req.usuarioId, req.idRecurso, req.dados);
    return res.status(200).json(fonte);
  } catch (erro) {
    if (erro.code === '23505') return next(erroNomeDuplicado());
    return next(erro);
  }
});

// DELETE /api/fontes-destinos/:id → 204, 404, 409
router.delete('/:id', validarId, async (req, res, next) => {
  try {
    const fonte = await FonteDestino.buscarPorId(req.usuarioId, req.idRecurso);
    if (!fonte) throw new ErroApi(404, 'Fonte/destino não encontrado.');

    const emUso = await FonteDestino.contarLancamentos(req.usuarioId, fonte.id);
    if (emUso > 0) {
      throw new ErroApi(409, `Não foi possível excluir "${fonte.nome}".`, {
        fonteDestino: `Existem ${emUso} lançamento(s) vinculados. Exclua ou altere esses lançamentos antes.`,
      });
    }

    await FonteDestino.remover(req.usuarioId, fonte.id);
    return res.status(204).end();
  } catch (erro) {
    return next(erro);
  }
});

export default router;

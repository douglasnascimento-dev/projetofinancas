// src/routes/categorias.routes.js
// CRUD de categorias do usuário logado.
import express from 'express';
import Categoria from '../models/Categoria.js';
import { ErroApi } from '../middlewares/tratarErros.js';
import { inteiroPositivo, lerPeriodo, validarCategoria, validarId } from '../middlewares/validar.js';

const router = express.Router();

const erroNomeDuplicado = (tipo) => new ErroApi(409, 'Categoria já cadastrada.', {
  nome: `Já existe uma categoria de ${tipo === 'entrada' ? 'entrada' : 'saída'} com este nome.`,
});

// GET /api/categorias?tipo=&inicio=&fim= → 200
router.get('/', lerPeriodo, async (req, res, next) => {
  try {
    const tipo = ['entrada', 'saida'].includes(req.query.tipo) ? req.query.tipo : null;
    const categorias = await Categoria.listar(req.usuarioId, { tipo, ...req.periodo });
    return res.status(200).json(categorias);
  } catch (erro) {
    return next(erro);
  }
});

// POST /api/categorias → 201, 400, 409
router.post('/', validarCategoria, async (req, res, next) => {
  try {
    const categoria = await Categoria.inserir(req.usuarioId, req.dados);
    return res.status(201).json(categoria);
  } catch (erro) {
    if (erro.code === '23505') return next(erroNomeDuplicado(req.dados.tipo));
    return next(erro);
  }
});

// PUT /api/categorias/:id → 200, 400, 404, 409
router.put('/:id', validarId, validarCategoria, async (req, res, next) => {
  try {
    const atual = await Categoria.buscarPorId(req.usuarioId, req.idRecurso);
    if (!atual) throw new ErroApi(404, 'Categoria não encontrada.');

    // Mudar o tipo deixaria lançamentos com categoria de tipo diferente do seu
    if (atual.tipo !== req.dados.tipo && await Categoria.contarLancamentos(req.usuarioId, atual.id) > 0) {
      throw new ErroApi(409, 'Não é possível mudar o tipo.', {
        tipo: 'Esta categoria já tem lançamentos; o tipo não pode ser alterado.',
      });
    }

    const categoria = await Categoria.atualizar(req.usuarioId, req.idRecurso, req.dados);
    return res.status(200).json(categoria);
  } catch (erro) {
    if (erro.code === '23505') return next(erroNomeDuplicado(req.dados.tipo));
    return next(erro);
  }
});

// DELETE /api/categorias/:id?moverPara=<id> → 204, 404, 409
// Sem moverPara: só exclui se não houver lançamentos. Com moverPara: move os lançamentos antes de excluir.
router.delete('/:id', validarId, async (req, res, next) => {
  try {
    const categoria = await Categoria.buscarPorId(req.usuarioId, req.idRecurso);
    if (!categoria) throw new ErroApi(404, 'Categoria não encontrada.');

    let destino = null;
    if (req.query.moverPara !== undefined) {
      destino = await Categoria.buscarPorId(req.usuarioId, inteiroPositivo(req.query.moverPara));
      if (!destino || destino.id === categoria.id || destino.tipo !== categoria.tipo) {
        throw new ErroApi(400, 'Dados inválidos.', {
          moverPara: 'Escolha outra categoria sua, do mesmo tipo.',
        });
      }
    } else {
      const emUso = await Categoria.contarLancamentos(req.usuarioId, categoria.id);
      if (emUso > 0) {
        throw new ErroApi(409, `Não foi possível excluir "${categoria.nome}".`, {
          categoria: `Existem ${emUso} lançamento(s) vinculados a esta categoria. Mova-os para outra categoria antes de excluir.`,
        });
      }
    }

    await Categoria.remover(req.usuarioId, categoria.id, destino?.id);
    return res.status(204).end();
  } catch (erro) {
    return next(erro);
  }
});

export default router;

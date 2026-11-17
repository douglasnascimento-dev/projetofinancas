// src/models/Categoria.js
// Acesso à tabela categorias. Todo método recebe o usuarioId: um usuário nunca enxerga dados de outro.
import { query, transacao } from '../config/db.js';

class Categoria {

  // Lista as categorias com a quantidade de lançamentos e o total no período informado
  async listar(usuarioId, { tipo, inicio, fim }) {
    const { rows } = await query(
      `SELECT c.id, c.nome, c.tipo,
              COUNT(l.id)::int                                             AS lancamentos,
              COUNT(l.id) FILTER (WHERE l.data BETWEEN $3 AND $4)::int     AS lancamentos_periodo,
              COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $3 AND $4), 0) AS total_periodo
         FROM categorias c
         LEFT JOIN lancamentos l ON l.categoria_id = c.id
        WHERE c.usuario_id = $1
          AND ($2::text IS NULL OR c.tipo = $2)
        GROUP BY c.id
        ORDER BY c.tipo, c.nome`,
      [usuarioId, tipo ?? null, inicio, fim],
    );
    return rows.map((r) => ({ ...r, total_periodo: Number(r.total_periodo) }));
  }

  async buscarPorId(usuarioId, id) {
    const { rows } = await query(
      'SELECT id, nome, tipo FROM categorias WHERE id = $1 AND usuario_id = $2',
      [id, usuarioId],
    );
    return rows[0] ?? null;
  }

  async contarLancamentos(usuarioId, id) {
    const { rows } = await query(
      'SELECT COUNT(*)::int AS total FROM lancamentos WHERE categoria_id = $1 AND usuario_id = $2',
      [id, usuarioId],
    );
    return rows[0].total;
  }

  async inserir(usuarioId, { nome, tipo }) {
    const { rows } = await query(
      'INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3) RETURNING id, nome, tipo',
      [usuarioId, nome, tipo],
    );
    return rows[0];
  }

  async atualizar(usuarioId, id, { nome, tipo }) {
    const { rows } = await query(
      `UPDATE categorias SET nome = $3, tipo = $4
        WHERE id = $1 AND usuario_id = $2
        RETURNING id, nome, tipo`,
      [id, usuarioId, nome, tipo],
    );
    return rows[0] ?? null;
  }

  // Remove a categoria. Se moverParaId vier, antes move os lançamentos para ela (numa transação).
  async remover(usuarioId, id, moverParaId = null) {
    return transacao(async (cliente) => {
      if (moverParaId) {
        await cliente.query(
          'UPDATE lancamentos SET categoria_id = $3 WHERE categoria_id = $1 AND usuario_id = $2',
          [id, usuarioId, moverParaId],
        );
      }
      const { rowCount } = await cliente.query(
        'DELETE FROM categorias WHERE id = $1 AND usuario_id = $2',
        [id, usuarioId],
      );
      return rowCount > 0;
    });
  }

}

export default new Categoria();

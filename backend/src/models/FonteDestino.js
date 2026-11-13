// src/models/FonteDestino.js
// Acesso à tabela fontes_destinos (renda, conta ou cartão de crédito).
import { query } from '../config/db.js';

const CAMPOS = `id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva`;

const formatar = (linha) => linha && ({ ...linha, limite: linha.limite === null ? null : Number(linha.limite) });

class FonteDestino {

  async listar(usuarioId) {
    const { rows } = await query(
      `SELECT f.id, f.nome, f.tipo, f.dia_fechamento, f.dia_vencimento, f.limite, f.reserva,
              COUNT(l.id)::int AS lancamentos
         FROM fontes_destinos f
         LEFT JOIN lancamentos l ON l.fonte_destino_id = f.id
        WHERE f.usuario_id = $1
        GROUP BY f.id
        ORDER BY CASE f.tipo WHEN 'renda' THEN 1 WHEN 'conta' THEN 2 ELSE 3 END, f.nome`,
      [usuarioId],
    );
    return rows.map(formatar);
  }

  async buscarPorId(usuarioId, id) {
    const { rows } = await query(
      `SELECT ${CAMPOS} FROM fontes_destinos WHERE id = $1 AND usuario_id = $2`,
      [id, usuarioId],
    );
    return formatar(rows[0]) ?? null;
  }

  async contarLancamentos(usuarioId, id) {
    const { rows } = await query(
      'SELECT COUNT(*)::int AS total FROM lancamentos WHERE fonte_destino_id = $1 AND usuario_id = $2',
      [id, usuarioId],
    );
    return rows[0].total;
  }

  async inserir(usuarioId, d) {
    const { rows } = await query(
      `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${CAMPOS}`,
      [usuarioId, d.nome, d.tipo, d.diaFechamento, d.diaVencimento, d.limite, d.reserva],
    );
    return formatar(rows[0]);
  }

  async atualizar(usuarioId, id, d) {
    const { rows } = await query(
      `UPDATE fontes_destinos
          SET nome = $3, tipo = $4, dia_fechamento = $5, dia_vencimento = $6, limite = $7, reserva = $8
        WHERE id = $1 AND usuario_id = $2
        RETURNING ${CAMPOS}`,
      [id, usuarioId, d.nome, d.tipo, d.diaFechamento, d.diaVencimento, d.limite, d.reserva],
    );
    return formatar(rows[0]) ?? null;
  }

  async remover(usuarioId, id) {
    const { rowCount } = await query(
      'DELETE FROM fontes_destinos WHERE id = $1 AND usuario_id = $2',
      [id, usuarioId],
    );
    return rowCount > 0;
  }

}

export default new FonteDestino();

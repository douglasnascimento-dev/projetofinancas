// src/models/Lancamento.js
// Acesso à tabela lancamentos: listagem com filtros, totais, parcelamento em transação.
import { randomUUID } from 'node:crypto';
import { query, transacao } from '../config/db.js';
import { dividirEmParcelas } from './regras/parcelas.js';

const SELECT_COMPLETO = `
  SELECT l.id, l.tipo, l.descricao, l.valor, l.data,
         l.parcela_atual, l.total_parcelas, l.grupo_parcelamento,
         l.categoria_id, c.nome AS categoria_nome,
         l.fonte_destino_id, f.nome AS fonte_destino_nome, f.tipo AS fonte_destino_tipo
    FROM lancamentos l
    JOIN categorias      c ON c.id = l.categoria_id
    JOIN fontes_destinos f ON f.id = l.fonte_destino_id`;

const formatar = (linha) => linha && ({ ...linha, valor: Number(linha.valor) });

// Monta o WHERE dos filtros sempre com parâmetros ($1, $2...) — nunca concatenando valores
function montarFiltros(usuarioId, { inicio, fim, tipo, categoriaId, fonteDestinoId }) {
  const condicoes = ['l.usuario_id = $1', 'l.data BETWEEN $2 AND $3'];
  const parametros = [usuarioId, inicio, fim];
  if (tipo) { parametros.push(tipo); condicoes.push(`l.tipo = $${parametros.length}`); }
  if (categoriaId) { parametros.push(categoriaId); condicoes.push(`l.categoria_id = $${parametros.length}`); }
  if (fonteDestinoId) { parametros.push(fonteDestinoId); condicoes.push(`l.fonte_destino_id = $${parametros.length}`); }
  return { where: condicoes.join(' AND '), parametros };
}

class Lancamento {

  async listar(usuarioId, filtros) {
    const { where, parametros } = montarFiltros(usuarioId, filtros);
    const { pagina, porPagina } = filtros;

    // Totais calculados no banco (SUM com FILTER), não no front-end
    const totais = await query(
      `SELECT COUNT(*)::int AS quantidade,
              COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0) AS entradas,
              COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0)   AS saidas
         FROM lancamentos l
        WHERE ${where}`,
      parametros,
    );

    const itens = await query(
      `${SELECT_COMPLETO}
        WHERE ${where}
        ORDER BY l.data DESC, l.id DESC
        LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, porPagina, (pagina - 1) * porPagina],
    );

    const t = totais.rows[0];
    const entradas = Number(t.entradas);
    const saidas = Number(t.saidas);
    return {
      itens: itens.rows.map(formatar),
      quantidade: t.quantidade,
      totais: { entradas, saidas, saldo: Math.round((entradas - saidas) * 100) / 100 },
    };
  }

  async buscarPorId(usuarioId, id) {
    const { rows } = await query(`${SELECT_COMPLETO} WHERE l.id = $1 AND l.usuario_id = $2`, [id, usuarioId]);
    return formatar(rows[0]) ?? null;
  }

  // Cria 1 lançamento ou N parcelas (mesmo grupo_parcelamento), tudo numa transação
  async inserir(usuarioId, d) {
    const parcelas = d.parcelas ?? 1;
    const grupo = parcelas > 1 ? randomUUID() : null;
    const valores = dividirEmParcelas(d.valor, parcelas);

    return transacao(async (cliente) => {
      const ids = [];
      for (let i = 0; i < parcelas; i++) {
        const { rows } = await cliente.query(
          `INSERT INTO lancamentos
             (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id,
              parcela_atual, total_parcelas, grupo_parcelamento)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [usuarioId, d.tipo, d.descricao, valores[i], d.data, d.categoriaId, d.fonteDestinoId, i + 1, parcelas, grupo],
        );
        ids.push(rows[0].id);
      }
      const { rows } = await cliente.query(
        `${SELECT_COMPLETO} WHERE l.id = ANY($1) ORDER BY l.parcela_atual`,
        [ids],
      );
      return rows.map(formatar);
    });
  }

  // Edita um lançamento (ou uma parcela). O número de parcelas não muda na edição.
  async atualizar(usuarioId, id, d) {
    const { rowCount } = await query(
      `UPDATE lancamentos
          SET tipo = $3, descricao = $4, valor = $5, data = $6, categoria_id = $7, fonte_destino_id = $8
        WHERE id = $1 AND usuario_id = $2`,
      [id, usuarioId, d.tipo, d.descricao, d.valor, d.data, d.categoriaId, d.fonteDestinoId],
    );
    return rowCount > 0 ? this.buscarPorId(usuarioId, id) : null;
  }

  // Remove só este lançamento ou, com todasParcelas, todas as parcelas da mesma compra
  async remover(usuarioId, id, todasParcelas = false) {
    const { rowCount } = await query(
      todasParcelas
        ? `DELETE FROM lancamentos
            WHERE usuario_id = $2
              AND (id = $1 OR grupo_parcelamento = (
                    SELECT grupo_parcelamento FROM lancamentos WHERE id = $1 AND usuario_id = $2))`
        : 'DELETE FROM lancamentos WHERE id = $1 AND usuario_id = $2',
      [id, usuarioId],
    );
    return rowCount;
  }

}

export default new Lancamento();

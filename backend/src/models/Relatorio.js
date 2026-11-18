// src/models/Relatorio.js
// Relatórios calculados no banco (GROUP BY / SUM), nunca somando listas no front-end.
import { query } from '../config/db.js';

const arredondar = (n) => Math.round(n * 100) / 100;

class Relatorio {

  // RF7 — totais por categoria e tipo no período e no período anterior de mesmo tamanho.
  // Uma única consulta: SUM com FILTER separa os dois períodos.
  async porCategoria(usuarioId, periodo, anterior) {
    const { rows } = await query(
      `SELECT c.id, c.nome, c.tipo,
              COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $2 AND $3), 0) AS total,
              COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $4 AND $5), 0) AS periodo_anterior
         FROM lancamentos l
         JOIN categorias  c ON c.id = l.categoria_id
        WHERE l.usuario_id = $1
          AND (l.data BETWEEN $2 AND $3 OR l.data BETWEEN $4 AND $5)
        GROUP BY c.id, c.nome, c.tipo
        ORDER BY total DESC, c.nome`,
      [usuarioId, periodo.inicio, periodo.fim, anterior.inicio, anterior.fim],
    );

    const linhas = rows.map((r) => ({
      id: r.id, nome: r.nome, tipo: r.tipo,
      total: Number(r.total), periodoAnterior: Number(r.periodo_anterior),
    }));

    const montar = (tipo) => {
      const lista = linhas.filter((l) => l.tipo === tipo);
      const total = arredondar(lista.reduce((s, l) => s + l.total, 0));
      const totalAnterior = arredondar(lista.reduce((s, l) => s + l.periodoAnterior, 0));
      return {
        total,
        totalAnterior,
        categorias: lista.map(({ tipo: _t, ...l }) => ({
          ...l,
          percentual: total > 0 ? arredondar((l.total / total) * 100) : 0,
          variacao: l.periodoAnterior > 0 ? arredondar(((l.total - l.periodoAnterior) / l.periodoAnterior) * 100) : null,
        })),
      };
    };

    return { saidas: montar('saida'), entradas: montar('entrada') };
  }

}

export default new Relatorio();

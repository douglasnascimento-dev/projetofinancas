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

  // RF8 — entradas por fonte, saídas por destino e saldo das contas no período
  async porFonteDestino(usuarioId, periodo) {
    const { rows } = await query(
      `SELECT f.id, f.nome, f.tipo,
              COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0) AS entradas,
              COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0)   AS saidas
         FROM fontes_destinos f
         LEFT JOIN lancamentos l
                ON l.fonte_destino_id = f.id
               AND l.usuario_id = $1
               AND l.data BETWEEN $2 AND $3
        WHERE f.usuario_id = $1
        GROUP BY f.id, f.nome, f.tipo
        ORDER BY f.nome`,
      [usuarioId, periodo.inicio, periodo.fim],
    );

    const linhas = rows.map((r) => ({
      id: r.id, nome: r.nome, tipo: r.tipo, entradas: Number(r.entradas), saidas: Number(r.saidas),
    }));
    const soma = (lista, campo) => arredondar(lista.reduce((s, l) => s + l[campo], 0));
    const porValor = (campo) => (a, b) => b[campo] - a[campo];

    const fontes = linhas.filter((l) => l.entradas > 0).sort(porValor('entradas'))
      .map(({ id, nome, tipo, entradas }) => ({ id, nome, tipo, total: entradas }));
    const destinos = linhas.filter((l) => l.saidas > 0).sort(porValor('saidas'))
      .map(({ id, nome, tipo, saidas }) => ({ id, nome, tipo, total: saidas }));
    const contas = linhas.filter((l) => l.tipo === 'conta')
      .map((l) => ({ id: l.id, nome: l.nome, entradas: l.entradas, saidas: l.saidas, saldo: arredondar(l.entradas - l.saidas) }));

    return {
      totalEntradas: soma(linhas, 'entradas'),
      totalSaidas: soma(linhas, 'saidas'),
      fontes,
      destinos,
      contas,
      totalContas: { entradas: soma(contas, 'entradas'), saidas: soma(contas, 'saidas'), saldo: soma(contas, 'saldo') },
    };
  }

}

export default new Relatorio();

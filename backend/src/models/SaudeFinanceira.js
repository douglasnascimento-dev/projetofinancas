// src/models/SaudeFinanceira.js
// Busca os totais agregados no banco e entrega para as regras de saúde financeira.
import { query } from '../config/db.js';
import { iso } from './regras/datas.js';
import { somarMesesReferencia } from './regras/faturas.js';
import { calcularSaude } from './regras/saude.js';
import Fatura from './Fatura.js';

class SaudeFinanceira {

  // meses: quantos meses completos (anteriores ao atual) entram nas médias
  async calcular(usuarioId, { meses = 3, hoje = iso(new Date()) } = {}) {
    const mesAtual = hoje.slice(0, 7);
    const mesesBase = Array.from({ length: meses }, (_, k) => somarMesesReferencia(mesAtual, k - meses));

    // Totais por mês, tipo e categoria — separando o que foi no cartão e o que foi parcelado
    const { rows } = await query(
      `SELECT to_char(l.data, 'YYYY-MM') AS mes, l.tipo, c.nome AS categoria,
              (f.tipo = 'cartao_credito') AS cartao, (l.total_parcelas > 1) AS parcelado,
              SUM(l.valor) AS total
         FROM lancamentos l
         JOIN categorias      c ON c.id = l.categoria_id
         JOIN fontes_destinos f ON f.id = l.fonte_destino_id
        WHERE l.usuario_id = $1
          AND l.data >= $2::date
          AND l.data < ($3::date + INTERVAL '1 month')
        GROUP BY 1, 2, 3, 4, 5`,
      [usuarioId, `${mesesBase[0]}-01`, `${mesAtual}-01`],
    );
    const linhas = rows.map((r) => ({ ...r, total: Number(r.total) }));

    // Saldo das contas marcadas como reserva (todo o histórico)
    const { rows: [reserva] } = await query(
      `SELECT COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE -l.valor END), 0) AS saldo
         FROM lancamentos l
         JOIN fontes_destinos f ON f.id = l.fonte_destino_id
        WHERE l.usuario_id = $1 AND f.reserva = TRUE`,
      [usuarioId],
    );

    const cartoes = await Fatura.calcular(usuarioId, { meses: 6, hoje });

    return calcularSaude({ linhas, mesesBase, mesAtual, cartoes, reserva: Number(reserva.saldo) });
  }

}

export default new SaudeFinanceira();

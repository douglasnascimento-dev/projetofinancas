// src/models/Fatura.js
// Previsão das faturas dos cartões de crédito (RF9).
// Cada parcela guarda a data da COMPRA; a fatura em que ela cai é calculada com
// calcularFatura(data, cartao, parcela_atual). Assim, mudar o dia de fechamento do cartão
// recalcula todas as faturas, sem precisar regravar os lançamentos.
import { query } from '../config/db.js';
import { iso } from './regras/datas.js';
import { calcularFatura, datasDaFatura, faturaAberta, somarMesesReferencia } from './regras/faturas.js';

const arredondar = (n) => Math.round(n * 100) / 100;

class Fatura {

  // Resposta da rota: sem a lista interna de parcelas a vencer
  async listar(usuarioId, opcoes) {
    const cartoes = await this.calcular(usuarioId, opcoes);
    return cartoes.map(({ aVencer: _a, ...c }) => c);
  }

  // meses: quantas faturas previstas mostrar além da aberta; hoje: 'AAAA-MM-DD'
  // Também devolve aVencer (parcelas cuja fatura ainda não venceu), usado pela saúde financeira.
  async calcular(usuarioId, { meses = 3, hoje = iso(new Date()) } = {}) {
    const { rows: cartoes } = await query(
      `SELECT id, nome, dia_fechamento, dia_vencimento, limite
         FROM fontes_destinos
        WHERE usuario_id = $1 AND tipo = 'cartao_credito'
        ORDER BY nome`,
      [usuarioId],
    );
    if (cartoes.length === 0) return [];

    // Compras de até 4 anos atrás ainda podem ter parcelas a vencer (máx. 48 parcelas)
    const [a, m, d] = hoje.split('-').map(Number);
    const desde = iso(new Date(Date.UTC(a - 4, m - 2, d)));
    const { rows: lancamentos } = await query(
      `SELECT l.id, l.descricao, l.valor, l.data, l.parcela_atual, l.total_parcelas,
              l.fonte_destino_id, c.nome AS categoria_nome
         FROM lancamentos l
         JOIN categorias  c ON c.id = l.categoria_id
        WHERE l.usuario_id = $1
          AND l.tipo = 'saida'
          AND l.fonte_destino_id = ANY($2)
          AND l.data >= $3
        ORDER BY l.data DESC, l.id DESC`,
      [usuarioId, cartoes.map((c) => c.id), desde],
    );

    return cartoes.map((c) => {
      const cartao = { diaFechamento: c.dia_fechamento, diaVencimento: c.dia_vencimento };
      const limite = Number(c.limite);

      // Em qual fatura cai cada parcela deste cartão
      const itens = lancamentos
        .filter((l) => l.fonte_destino_id === c.id)
        .map((l) => ({
          id: l.id,
          descricao: l.descricao,
          categoria: l.categoria_nome,
          data: l.data,
          valor: Number(l.valor),
          parcelaAtual: l.parcela_atual,
          totalParcelas: l.total_parcelas,
          ...calcularFatura(l.data, cartao, l.parcela_atual),
        }));

      // Limite comprometido: todas as parcelas cuja fatura ainda não venceu
      const aVencer = itens.filter((i) => i.vencimento >= hoje);
      const utilizado = arredondar(aVencer.reduce((s, i) => s + i.valor, 0));

      // Fatura aberta + as próximas `meses` faturas previstas
      const aberta = faturaAberta(cartao, hoje).referencia;
      const faturas = Array.from({ length: meses + 1 }, (_, k) => {
        const referencia = somarMesesReferencia(aberta, k);
        const doMes = itens.filter((i) => i.referencia === referencia);
        return {
          ...datasDaFatura(referencia, cartao),
          situacao: k === 0 ? 'aberta' : 'prevista',
          total: arredondar(doMes.reduce((s, i) => s + i.valor, 0)),
          lancamentos: doMes.map(({ referencia: _r, fechamento: _f, vencimento: _v, ...i }) => i),
        };
      });

      return {
        id: c.id,
        nome: c.nome,
        diaFechamento: c.dia_fechamento,
        diaVencimento: c.dia_vencimento,
        limite,
        limiteUtilizado: utilizado,
        limiteDisponivel: arredondar(limite - utilizado),
        faturas,
        aVencer: aVencer.map((i) => ({ valor: i.valor, referencia: i.referencia, totalParcelas: i.totalParcelas })),
      };
    });
  }

}

export default new Fatura();

// src/models/regras/faturas.js
// Regra de fechamento das faturas de cartão de crédito (RF9). Datas em UTC, sem fuso horário.
import { iso, ultimoDiaDoMes } from './datas.js';

// Monta uma data aceitando mês fora de 0–11 e ajustando o dia ao último dia do mês (ex.: 31 em fevereiro)
function dataSegura(ano, mes, dia) {
  const a = ano + Math.floor(mes / 12);
  const m = ((mes % 12) + 12) % 12;
  return new Date(Date.UTC(a, m, Math.min(dia, ultimoDiaDoMes(a, m))));
}

// Em qual fatura cai a parcela de uma compra.
//   dataCompra: 'AAAA-MM-DD'; cartao: { diaFechamento, diaVencimento }; numeroParcela: 1..N
// Regras:
//   - compra antes do dia de fechamento → fatura que fecha no mesmo mês; no dia ou depois → mês seguinte;
//   - a parcela k cai k − 1 meses depois da fatura da 1ª parcela;
//   - vencimento > fechamento → vence no mesmo mês do fechamento; senão, no mês seguinte.
// Retorna { referencia: 'AAAA-MM' (mês do vencimento), fechamento, vencimento }.
export function calcularFatura(dataCompra, cartao, numeroParcela = 1) {
  const [ano, mes, dia] = dataCompra.split('-').map(Number);
  const m = mes - 1;
  const fechamentoDoMes = Math.min(cartao.diaFechamento, ultimoDiaDoMes(ano, m));

  let mesFechamento = dia < fechamentoDoMes ? m : m + 1;
  mesFechamento += numeroParcela - 1;

  const fechamento = dataSegura(ano, mesFechamento, cartao.diaFechamento);
  const mesVencimento = cartao.diaVencimento > cartao.diaFechamento ? mesFechamento : mesFechamento + 1;
  const vencimento = dataSegura(ano, mesVencimento, cartao.diaVencimento);

  return { referencia: iso(vencimento).slice(0, 7), fechamento: iso(fechamento), vencimento: iso(vencimento) };
}

// Fatura aberta na data informada: a que receberia uma compra feita hoje
export function faturaAberta(cartao, hoje) {
  return calcularFatura(hoje, cartao, 1);
}

// 'AAAA-MM' somando meses: ('2026-12', 2) → '2027-02'
export function somarMesesReferencia(referencia, quantidade) {
  const [a, m] = referencia.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + quantidade, 1));
  return iso(d).slice(0, 7);
}

// Datas de fechamento e vencimento de uma fatura a partir da sua referência (mês do vencimento)
export function datasDaFatura(referencia, cartao) {
  const [a, m] = referencia.split('-').map(Number);
  const mesVenc = m - 1;
  const mesFech = cartao.diaVencimento > cartao.diaFechamento ? mesVenc : mesVenc - 1;
  return {
    referencia,
    fechamento: iso(dataSegura(a, mesFech, cartao.diaFechamento)),
    vencimento: iso(dataSegura(a, mesVenc, cartao.diaVencimento)),
  };
}

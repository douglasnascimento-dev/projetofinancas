// Testes da regra de fechamento das faturas (tabela 10.3 do enunciado) — rode com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularFatura, datasDaFatura, somarMesesReferencia } from './faturas.js';

const nubank = { diaFechamento: 3, diaVencimento: 10 };
const visa = { diaFechamento: 25, diaVencimento: 5 };

test('compra antes do fechamento entra na fatura do mesmo mês', () => {
  assert.deepEqual(calcularFatura('2026-11-02', nubank),
    { referencia: '2026-11', fechamento: '2026-11-03', vencimento: '2026-11-10' });
});

test('compra no dia do fechamento entra na fatura do mês seguinte', () => {
  assert.deepEqual(calcularFatura('2026-11-03', nubank),
    { referencia: '2026-12', fechamento: '2026-12-03', vencimento: '2026-12-10' });
});

test('vencimento menor que o fechamento vence no mês seguinte', () => {
  assert.deepEqual(calcularFatura('2026-12-28', visa),
    { referencia: '2027-02', fechamento: '2027-01-25', vencimento: '2027-02-05' });
});

test('parcela 3/3 cai dois meses depois da primeira', () => {
  assert.deepEqual(calcularFatura('2026-12-20', visa, 3),
    { referencia: '2027-03', fechamento: '2027-02-25', vencimento: '2027-03-05' });
});

test('fechamento no dia 31 é ajustado para o último dia de fevereiro', () => {
  const cartao = { diaFechamento: 31, diaVencimento: 8 };
  assert.deepEqual(calcularFatura('2027-02-10', cartao),
    { referencia: '2027-03', fechamento: '2027-02-28', vencimento: '2027-03-08' });
});

test('datasDaFatura reconstrói fechamento e vencimento a partir da referência', () => {
  assert.deepEqual(datasDaFatura('2027-02', visa), calcularFatura('2026-12-28', visa));
  assert.deepEqual(datasDaFatura('2026-12', nubank), calcularFatura('2026-11-03', nubank));
});

test('somarMesesReferencia atravessa o ano', () => {
  assert.equal(somarMesesReferencia('2026-11', 3), '2027-02');
});

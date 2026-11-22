// Testes dos indicadores da saúde financeira — rode com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularSaude } from './saude.js';

const mesesBase = ['2026-08', '2026-09', '2026-10'];
const linha = (mes, tipo, categoria, total, extra = {}) => ({ mes, tipo, categoria, total, cartao: false, parcelado: false, ...extra });

// Renda de 5.000 por mês; gastos de 4.000 (2.000 moradia, 1.000 alimentação, 1.000 lazer)
const linhas = mesesBase.flatMap((m) => [
  linha(m, 'entrada', 'Salário', 5000),
  linha(m, 'saida', 'Moradia', 2000),
  linha(m, 'saida', 'Alimentação', 1000),
  linha(m, 'saida', 'Lazer', 1000),
]).concat([linha('2026-11', 'saida', 'Alimentação', 1500)]);

const cartoes = [{
  faturas: [{ total: 900 }, { total: 600 }, { total: 0 }],
  aVencer: [
    { valor: 300, referencia: '2026-12', totalParcelas: 3 },
    { valor: 300, referencia: '2027-01', totalParcelas: 3 },
    { valor: 600, referencia: '2026-12', totalParcelas: 1 },
  ],
}];

const r = calcularSaude({ linhas, mesesBase, mesAtual: '2026-11', cartoes, reserva: 6000 });

test('taxa de poupança = (entradas − saídas) ÷ entradas', () => {
  assert.equal(r.indicadores.taxaPoupanca, 20);
  assert.equal(r.indicadores.taxaUltimoMes, 20);
});

test('comprometimento = média das próximas 3 faturas ÷ renda média', () => {
  assert.equal(r.indicadores.comprometimento, 10);     // (1500 / 3) / 5000
});

test('parcelas futuras ignoram compras à vista', () => {
  assert.deepEqual(r.indicadores.parcelasFuturas, { total: 600, ate: '2027-01' });
});

test('reserva em meses de despesa', () => {
  assert.equal(r.indicadores.reserva.meses, 1.5);       // 6000 / 4000
});

test('regra 50/30/20 classifica moradia e alimentação como necessidades', () => {
  assert.equal(r.regra502030.necessidades, 60);
  assert.equal(r.regra502030.desejos, 20);
  assert.equal(r.regra502030.poupanca, 20);
});

test('categoria fora da curva: alimentação 50% acima da média', () => {
  assert.equal(r.foraDaCurva[0].categoria, 'Alimentação');
  assert.equal(r.foraDaCurva[0].acima, 50);
});

test('projeção desconta as parcelas conhecidas do mês', () => {
  const dez = r.serie.find((s) => s.mes === '2026-12');
  assert.equal(dez.resultado, 700);                     // 5000 − 4000 − 300
  assert.equal(r.serie.filter((s) => s.projetado).length, 6);
});

test('gera dicas a partir dos dados', () => {
  const textos = r.dicas.map((d) => d.texto).join(' ');
  assert.match(textos, /Alimentação estão 50,0% acima/);
  assert.match(textos, /reserva cobre 1,5/);
});

test('meses antes do primeiro lançamento não entram nas médias', () => {
  const r2 = calcularSaude({ linhas, mesesBase: ['2026-07', ...mesesBase], mesAtual: '2026-11', cartoes, reserva: 6000 });
  assert.deepEqual(r2.mesesBase, mesesBase);
  assert.equal(r2.indicadores.rendaMedia, 5000);
});

// Testes da divisão em parcelas — rode com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dividirEmParcelas, paraCentavos } from './parcelas.js';

const somaCentavos = (lista) => lista.reduce((s, v) => s + paraCentavos(v), 0);

test('R$ 100,00 em 3x → 33,34 + 33,33 + 33,33', () => {
  assert.deepEqual(dividirEmParcelas(100, 3), [33.34, 33.33, 33.33]);
});

test('a soma das parcelas é exatamente o valor original', () => {
  for (const [valor, n] of [[100, 3], [3899, 10], [0.1, 3], [1195, 4], [1234.57, 48], [10, 7]]) {
    assert.equal(somaCentavos(dividirEmParcelas(valor, n)), paraCentavos(valor));
  }
});

test('1 parcela devolve o próprio valor', () => {
  assert.deepEqual(dividirEmParcelas(48.9, 1), [48.9]);
});

test('aceita valor em texto, como chega do PostgreSQL', () => {
  assert.deepEqual(dividirEmParcelas('199.00', 3), [66.34, 66.33, 66.33]);
});

// Testes da validação de CPF — rode com: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpfValido, normalizarCpf } from './cpf.js';

test('aceita CPF válido com e sem pontuação', () => {
  assert.equal(cpfValido('529.982.247-25'), true);
  assert.equal(cpfValido('52998224725'), true);
});

test('rejeita dígito verificador errado', () => {
  assert.equal(cpfValido('529.982.247-24'), false);
});

test('rejeita sequências repetidas e tamanho errado', () => {
  assert.equal(cpfValido('111.111.111-11'), false);
  assert.equal(cpfValido('1234567890'), false);
  assert.equal(cpfValido(''), false);
  assert.equal(cpfValido(null), false);
});

test('normaliza para só dígitos', () => {
  assert.equal(normalizarCpf('529.982.247-25'), '52998224725');
});

// src/models/regras/parcelas.js
// Regras puras sobre dinheiro e parcelamento. Toda conta é feita em centavos inteiros
// (em JavaScript, 0.1 + 0.2 !== 0.3), e só no fim volta para reais.

export const paraCentavos = (valor) => Math.round(Number(valor) * 100);
export const paraReais = (centavos) => centavos / 100;

// Divide um valor em N parcelas; a diferença de arredondamento vai para a 1ª parcela.
// Ex.: 100,00 em 3x → [33.34, 33.33, 33.33]
export function dividirEmParcelas(valor, quantidade) {
  const total = paraCentavos(valor);
  const base = Math.floor(total / quantidade);
  const sobra = total - base * quantidade;
  return Array.from({ length: quantidade }, (_, i) => paraReais(i === 0 ? base + sobra : base));
}

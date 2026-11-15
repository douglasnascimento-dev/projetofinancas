// src/services/formatadores.js
// Formatação em pt-BR e máscaras de campos.

const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// 1234.5 ou '1234.50' → 'R$ 1.234,50'
export function moeda(valor) {
  return formatoMoeda.format(Number(valor ?? 0));
}

// '2026-11-13' → '13/11/2026' (sem passar por Date, para não sofrer com fuso horário)
export function data(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = String(iso).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

// '52998224725' → '529.982.247-25' (aplicada enquanto o usuário digita)
export function mascaraCpf(valor) {
  const d = String(valor).replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

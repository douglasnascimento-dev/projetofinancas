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

// Máscara de valor monetário enquanto digita: '389' → '3,89'; '389000' → '3.890,00'
export function mascaraMoeda(valor) {
  const digitos = String(valor).replace(/\D/g, '').replace(/^0+/, '').slice(0, 11);
  if (!digitos) return '';
  const centavos = digitos.padStart(3, '0');
  const inteiro = centavos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${inteiro},${centavos.slice(-2)}`;
}

// '3.890,00' → 3890 (número para enviar à API)
export function lerMoeda(texto) {
  if (!texto) return null;
  return Number(String(texto).replace(/\./g, '').replace(',', '.'));
}

// 3890 → '3.890,00' (para preencher o campo ao editar)
export function numeroParaMascara(valor) {
  return mascaraMoeda(Math.round(Number(valor) * 100).toString());
}

// Mesma regra do servidor, usada só para mostrar a prévia: centavos inteiros, sobra na 1ª parcela
export function dividirEmParcelas(valor, quantidade) {
  const total = Math.round(Number(valor) * 100);
  const base = Math.floor(total / quantidade);
  return Array.from({ length: quantidade }, (_, i) => (i === 0 ? base + total - base * quantidade : base) / 100);
}

// Primeiro e último dia de um mês ('AAAA-MM') → { inicio, fim }
export function periodoDoMes(anoMes) {
  const [ano, mes] = anoMes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return { inicio: `${anoMes}-01`, fim: `${anoMes}-${String(ultimo).padStart(2, '0')}` };
}

// Data de hoje em 'AAAA-MM-DD' no fuso do usuário
export function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 'AAAA-MM' somando meses: ('2026-11', 1) → '2026-12'
export function somarMeses(anoMes, quantidade) {
  const [ano, mes] = anoMes.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 + quantidade, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
// '2026-11' → 'Novembro de 2026'
export function nomeDoMes(anoMes) {
  const [ano, mes] = anoMes.split('-').map(Number);
  return `${NOMES_MESES[mes - 1]} de ${ano}`;
}

// Cor estável para uma categoria (paleta de gráficos do design system)
const CORES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];
export function corDaCategoria(id) {
  return CORES[Number(id) % CORES.length];
}

// '52998224725' → '529.982.247-25' (aplicada enquanto o usuário digita)
export function mascaraCpf(valor) {
  const d = String(valor).replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

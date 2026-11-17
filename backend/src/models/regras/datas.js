// src/models/regras/datas.js
// Datas sempre no formato 'AAAA-MM-DD' e em UTC, para não sofrer com fuso horário.

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Valida 'AAAA-MM-DD' e rejeita dias inexistentes (ex.: 2026-02-30)
export function dataValida(texto) {
  if (typeof texto !== 'string' || !DATA_REGEX.test(texto)) return false;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

export const iso = (data) => data.toISOString().slice(0, 10);

export function ultimoDiaDoMes(ano, mes) {          // mes: 0 a 11
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

// Primeiro e último dia do mês da data informada (padrão: hoje)
export function mesDe(referencia = new Date()) {
  const ano = referencia.getUTCFullYear();
  const mes = referencia.getUTCMonth();
  return {
    inicio: iso(new Date(Date.UTC(ano, mes, 1))),
    fim: iso(new Date(Date.UTC(ano, mes, ultimoDiaDoMes(ano, mes)))),
  };
}

// Quantidade de dias entre duas datas, contando as duas pontas
export function diasNoPeriodo(inicio, fim) {
  return Math.round((Date.parse(fim) - Date.parse(inicio)) / 86400000) + 1;
}

// Período anterior de mesmo tamanho. Se o período for um mês cheio, devolve o mês anterior cheio.
export function periodoAnterior(inicio, fim) {
  const [a, m, d] = inicio.split('-').map(Number);
  const mesCheio = d === 1 && fim === mesDe(new Date(Date.UTC(a, m - 1, 1))).fim;
  if (mesCheio) return mesDe(new Date(Date.UTC(a, m - 2, 1)));
  const dias = diasNoPeriodo(inicio, fim);
  const novoFim = new Date(Date.parse(inicio) - 86400000);
  const novoInicio = new Date(novoFim.getTime() - (dias - 1) * 86400000);
  return { inicio: iso(novoInicio), fim: iso(novoFim) };
}

// src/models/regras/saude.js
// Indicadores, projeção e dicas da página de saúde financeira (desafio).
// Funções puras: recebem os totais já agregados pelo banco e devolvem os números e as dicas.
// Os limites usados nas dicas estão documentados no README.

import { somarMesesReferencia } from './faturas.js';

// Limites das dicas (referências comuns de educação financeira)
export const LIMITES = {
  metaPoupanca: 10,          // % da renda guardada por mês
  comprometimentoAlto: 30,   // % da renda comprometida com as próximas 3 faturas
  foraDaCurva: 30,           // % acima da média dos meses anteriores
  reservaMinima: 3,          // meses de despesas
  reservaIdeal: 6,
  regra: { necessidades: 50, desejos: 30, poupanca: 20 },
};

// Categorias de saída consideradas necessidades na regra 50/30/20 (as demais contam como desejos)
export const NECESSIDADES = ['moradia', 'saúde', 'saude', 'mobilidade', 'educação', 'educacao', 'alimentação', 'alimentacao'];

const arredondar = (n, casas = 2) => Math.round(n * 10 ** casas) / 10 ** casas;
const soma = (lista, f = (x) => x) => lista.reduce((s, x) => s + f(x), 0);
const pct = (parte, todo) => (todo > 0 ? arredondar((parte / todo) * 100, 1) : 0);
const fmt = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const moeda = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const NOMES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = (ref) => `${NOMES[Number(ref.slice(5, 7)) - 1]} de ${ref.slice(0, 4)}`;

// linhas: [{ mes: 'AAAA-MM', tipo, categoria, cartao: bool, parcelado: bool, total }]
// mesesBase: meses completos usados nas médias (ex.: os 3 anteriores ao atual); mesAtual: 'AAAA-MM'
// cartoes: saída de Fatura.calcular; reserva: saldo das contas marcadas como reserva
export function calcularSaude({ linhas, mesesBase, mesAtual, cartoes, reserva, mesesProjecao = 6 }) {
  const doMes = (mes, filtro) => soma(linhas.filter((l) => l.mes === mes && filtro(l)), (l) => l.total);
  const n = mesesBase.length;

  // Histórico mês a mês (base + atual)
  const historico = [...mesesBase, mesAtual].map((mes) => {
    const entradas = doMes(mes, (l) => l.tipo === 'entrada');
    const saidas = doMes(mes, (l) => l.tipo === 'saida');
    return { mes, entradas: arredondar(entradas), saidas: arredondar(saidas), resultado: arredondar(entradas - saidas) };
  });
  const base = historico.slice(0, n);

  const rendaMedia = soma(base, (h) => h.entradas) / n;
  const saidasMedia = soma(base, (h) => h.saidas) / n;

  // 1. Taxa de poupança: (entradas − saídas) ÷ entradas nos meses base
  const entradasBase = soma(base, (h) => h.entradas);
  const taxaPoupanca = entradasBase > 0 ? pct(entradasBase - soma(base, (h) => h.saidas), entradasBase) : null;
  const ultimo = base[n - 1];
  const taxaUltimoMes = ultimo?.entradas > 0 ? pct(ultimo.entradas - ultimo.saidas, ultimo.entradas) : null;

  // 2. Comprometimento com cartões: total das próximas 3 faturas ÷ renda média mensal
  const proximas3 = soma(cartoes, (c) => soma(c.faturas.slice(0, 3), (f) => f.total));
  const comprometimento = rendaMedia > 0 ? pct(proximas3 / 3, rendaMedia) : null;

  // 3. Parcelas futuras: compras parceladas cuja fatura ainda não venceu
  const parcelas = cartoes.flatMap((c) => c.aVencer).filter((p) => p.totalParcelas > 1);
  const parcelasFuturas = {
    total: arredondar(soma(parcelas, (p) => p.valor)),
    ate: parcelas.length ? parcelas.map((p) => p.referencia).sort().at(-1) : null,
  };

  // 4. Reserva de emergência: saldo das contas de reserva ÷ média de saídas mensais
  const reservaMeses = saidasMedia > 0 ? arredondar(reserva / saidasMedia, 1) : null;

  // 5. Regra 50/30/20 nos meses base (% da renda)
  const saidasBase = linhas.filter((l) => l.tipo === 'saida' && mesesBase.includes(l.mes));
  const necessidades = soma(saidasBase.filter((l) => NECESSIDADES.includes(l.categoria.toLowerCase())), (l) => l.total);
  const desejos = soma(saidasBase, (l) => l.total) - necessidades;
  const regra502030 = {
    necessidades: pct(necessidades, entradasBase),
    desejos: pct(desejos, entradasBase),
    poupanca: entradasBase > 0 ? Math.max(0, pct(entradasBase - necessidades - desejos, entradasBase)) : 0,
    referencia: LIMITES.regra,
  };

  // 6. Projeção do resultado mensal: média móvel dos meses base + parcelas já conhecidas.
  // As compras parceladas entram pela fatura em que caem (não pela média), para não contar duas vezes.
  const mediaSem = (filtro) => soma(mesesBase, (m) => doMes(m, filtro)) / n;
  const saidasRecorrentes = mediaSem((l) => l.tipo === 'saida' && !l.parcelado);
  const parcelasPorMes = (ref) => soma(parcelas.filter((p) => p.referencia === ref), (p) => p.valor);
  const projecao = Array.from({ length: mesesProjecao }, (_, k) => {
    const mes = somarMesesReferencia(mesAtual, k + 1);
    return { mes, resultado: arredondar(rendaMedia - saidasRecorrentes - parcelasPorMes(mes)), projetado: true };
  });
  const primeiroNegativo = projecao.find((p) => p.resultado < 0)?.mes ?? null;

  // 7. Categoria fora da curva: gasto do mês atual × média dos meses base
  const categorias = [...new Set(linhas.filter((l) => l.tipo === 'saida').map((l) => l.categoria))];
  const foraDaCurva = categorias
    .map((categoria) => {
      const media = mediaSem((l) => l.tipo === 'saida' && l.categoria === categoria);
      const atual = doMes(mesAtual, (l) => l.tipo === 'saida' && l.categoria === categoria);
      return { categoria, media: arredondar(media), atual: arredondar(atual), acima: media > 0 ? pct(atual - media, media) : null };
    })
    .filter((c) => c.acima !== null && c.acima >= LIMITES.foraDaCurva)
    .sort((a, b) => b.acima - a.acima);

  // Dicas geradas por regras
  const dicas = [];
  for (const c of foraDaCurva.slice(0, 2)) {
    dicas.push({ tipo: 'atencao', texto: `Seus gastos com ${c.categoria} estão ${fmt(c.acima)}% acima da sua média dos últimos ${n} meses.` });
  }
  if (comprometimento !== null && comprometimento >= LIMITES.comprometimentoAlto) {
    dicas.push({ tipo: 'atencao', texto: `Suas faturas dos próximos 3 meses comprometem ${fmt(comprometimento)}% da sua renda. Evite novas compras parceladas por enquanto.` });
  }
  if (primeiroNegativo) {
    dicas.push({ tipo: 'atencao', texto: `Pela projeção, ${nomeMes(primeiroNegativo)} pode fechar no negativo. Reveja os gastos ou adie compras parceladas.` });
  }
  if (taxaUltimoMes !== null) {
    dicas.push(taxaUltimoMes >= LIMITES.metaPoupanca
      ? { tipo: 'positivo', texto: `Você guardou ${fmt(taxaUltimoMes)}% da sua renda em ${nomeMes(ultimo.mes)}, acima da meta comum de ${LIMITES.metaPoupanca}%.` }
      : { tipo: 'atencao', texto: `Você guardou ${fmt(taxaUltimoMes)}% da sua renda em ${nomeMes(ultimo.mes)}. Uma meta comum é guardar pelo menos ${LIMITES.metaPoupanca}%.` });
  }
  if (reservaMeses !== null && reservaMeses < LIMITES.reservaMinima) {
    const falta = LIMITES.reservaMinima * saidasMedia - reserva;
    dicas.push({ tipo: 'dica', texto: `Sua reserva cobre ${fmt(reservaMeses)} mês(es) de despesas. Uma referência comum é de ${LIMITES.reservaMinima} a ${LIMITES.reservaIdeal} meses: faltam ${moeda(arredondar(falta))} para chegar a ${LIMITES.reservaMinima} meses.` });
  }
  if (regra502030.desejos > LIMITES.regra.desejos) {
    dicas.push({ tipo: 'dica', texto: `Os gastos com desejos estão em ${fmt(regra502030.desejos)}% da renda (referência: ${LIMITES.regra.desejos}%).` });
  }
  if (parcelasFuturas.total > 0) {
    dicas.push({ tipo: 'dica', texto: `Você tem ${moeda(parcelasFuturas.total)} em parcelas até ${nomeMes(parcelasFuturas.ate)}.` });
  }

  return {
    mesesBase,
    indicadores: {
      taxaPoupanca, taxaUltimoMes, comprometimento, parcelasFuturas,
      reserva: { saldo: arredondar(reserva), meses: reservaMeses },
      rendaMedia: arredondar(rendaMedia), saidasMedia: arredondar(saidasMedia),
    },
    regra502030,
    foraDaCurva,
    serie: [...historico.map((h) => ({ mes: h.mes, resultado: h.resultado, projetado: false })), ...projecao],
    primeiroNegativo,
    dicas,
    temDados: entradasBase > 0 || soma(base, (h) => h.saidas) > 0,
  };
}

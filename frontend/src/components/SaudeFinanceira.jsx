// src/components/SaudeFinanceira.jsx
// Desafio: indicadores, projeção e dicas calculados no back-end (GET /api/saude-financeira).
import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../services/api';
import { moeda, nomeDoMes } from '../services/formatadores';
import { useBuscar } from './useBuscar';
import { Carregando, ErroCarregar, Vazio } from './Estados';
import { Kpi } from './Kpi';
import { CampoSelect } from './CampoSelect';

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const mesCurto = (ref) => MESES_CURTOS[Number(ref.slice(5, 7)) - 1];
const pct = (n) => (n === null || n === undefined ? '—' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);

const SELO_DICA = {
  atencao: ['selo-saida', 'Atenção'],
  positivo: ['selo-entrada', 'Bom sinal'],
  dica: ['selo-marca', 'Dica'],
};

export function SaudeFinanceira() {
  const [meses, setMeses] = useState('3');
  const resposta = useBuscar((signal) => api.get(`/saude-financeira?meses=${meses}`, { signal }), [meses]);
  const s = resposta.dados;

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1 className="h1">Saúde financeira</h1>
          <p className="texto-mutado">Indicadores calculados a partir dos seus lançamentos</p>
        </div>
        <div className="cabecalho-acoes">
          <CampoSelect rotulo="Base das médias" value={meses} onChange={(e) => setMeses(e.target.value)}>
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
          </CampoSelect>
        </div>
      </div>

      <div className="alerta alerta-info" role="note" style={{ marginBottom: 16 }}>
        <strong>Aviso</strong>&nbsp; As informações desta página são educativas e não constituem recomendação financeira profissional.
      </div>

      {resposta.erro ? <div className="card"><ErroCarregar erro={resposta.erro} aoTentarDeNovo={resposta.recarregar} /></div>
        : resposta.carregando && !s ? <div className="card"><Carregando linhas={6} /></div>
          : !s.temDados ? (
            <div className="card">
              <Vazio titulo="Ainda não há dados suficientes" texto={`Os indicadores usam os lançamentos dos últimos ${meses} meses completos. Registre suas entradas e saídas para ver a análise.`} />
            </div>
          ) : <Conteudo s={s} />}
    </>
  );
}

function Conteudo({ s }) {
  const i = s.indicadores;
  const corPoupanca = i.taxaPoupanca === null ? undefined : i.taxaPoupanca >= 10 ? 'entrada' : 'saida';
  const corReserva = i.reserva.meses === null ? undefined : i.reserva.meses >= 3 ? 'entrada' : 'alerta-texto';

  // Linha contínua para o real e tracejada para a projeção (ligadas no último mês real)
  const ultimoReal = s.serie.filter((p) => !p.projetado).at(-1);
  const dados = s.serie.map((p) => ({
    mes: mesCurto(p.mes),
    real: p.projetado ? undefined : p.resultado,
    projecao: p.projetado || p.mes === ultimoReal.mes ? p.resultado : undefined,
  }));

  return (
    <>
      <div className="kpis kpis-4">
        <Kpi rotulo="Taxa de poupança" valor={pct(i.taxaPoupanca)} corValor={corPoupanca} dica="Meta comum: 10% ou mais" />
        <Kpi rotulo="Comprometimento com cartões" valor={pct(i.comprometimento)} dica="Próximas 3 faturas ÷ renda média" />
        <Kpi rotulo="Parcelas futuras" valor={moeda(i.parcelasFuturas.total)}
          dica={i.parcelasFuturas.ate ? `A vencer até ${nomeDoMes(i.parcelasFuturas.ate).toLowerCase()}` : 'Nenhuma compra parcelada'} />
        <Kpi rotulo="Reserva de emergência" corValor={corReserva}
          valor={i.reserva.meses === null ? '—' : `${i.reserva.meses.toLocaleString('pt-BR')} ${i.reserva.meses === 1 ? 'mês' : 'meses'}`}
          dica="Referência: 3 a 6 meses" />
      </div>

      <div className="relatorio-grade">
        <section className="card">
          <div className="card-cabecalho">
            <h2 className="h2">Projeção do resultado mensal — próximos 6 meses</h2>
            {s.primeiroNegativo && <span className="selo selo-saida">{nomeDoMes(s.primeiroNegativo).split(' de ')[0]} fica negativo</span>}
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={dados} margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#E3E6EB" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => moeda(v).replace(',00', '')} width={90} tickLine={false} axisLine={false} />
                <ReferenceLine y={0} stroke="#C9CED6" />
                <Tooltip formatter={(v) => moeda(v)} />
                <Legend iconType="plainline" />
                <Line dataKey="real" name="Resultado real (entradas − saídas)" stroke="#1A3A8F" strokeWidth={2} dot={false} connectNulls />
                <Line dataKey="projecao" name="Projeção (média móvel + parcelas conhecidas)" stroke="#1A3A8F" strokeOpacity={0.6}
                  strokeWidth={2} strokeDasharray="6 4" connectNulls
                  dot={(p) => (p.value < 0 ? <circle key={p.index} cx={p.cx} cy={p.cy} r={4} fill="#C2261C" /> : <g key={p.index} />)} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <div className="card-cabecalho"><h2 className="h2">Regra 50/30/20</h2></div>
          {[['necessidades', 'Necessidades', '#1A3A8F', (v, r) => v > r],
            ['desejos', 'Desejos', '#0EA5E9', (v, r) => v > r],
            ['poupanca', 'Poupança', '#15803D', (v, r) => v < r]].map(([chave, rotulo, cor, ruim]) => {
            const valor = s.regra502030[chave];
            const ref = s.regra502030.referencia[chave];
            return (
              <div key={chave} className="regra-linha">
                <div className="regra-topo">
                  <span style={{ fontWeight: 500 }}>{rotulo}</span>
                  <span className="pequeno"><span className={ruim(valor, ref) ? 'saida' : 'entrada'}>{pct(valor)}</span> · ref. {ref}%</span>
                </div>
                <div className="regra-barra">
                  <span style={{ width: `${Math.min(100, valor)}%`, background: cor }} />
                  <i style={{ left: `${ref}%` }} aria-hidden="true" />
                </div>
              </div>
            );
          })}
          <p className="pequeno texto-mutado" style={{ marginTop: 12 }}>
            Classificação: Moradia, Saúde, Mobilidade, Educação e Alimentação são necessidades; as demais categorias de saída são desejos. Percentuais sobre a renda.
          </p>
        </section>
      </div>

      <section className="card">
        <div className="card-cabecalho"><h2 className="h2">Dicas geradas a partir dos seus dados</h2></div>
        {s.dicas.length === 0 ? <Vazio titulo="Tudo dentro das referências" texto="Nenhum indicador fora dos limites no período analisado." /> : (
          <ul className="dicas">
            {s.dicas.map((d, k) => (
              <li key={k}><span className={`selo ${SELO_DICA[d.tipo][0]}`}>{SELO_DICA[d.tipo][1]}</span>{d.texto}</li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

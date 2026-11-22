// src/components/Relatorios.jsx
// Relatórios do período: por categoria (RF7) e por fonte/destino (RF8). Os totais vêm calculados da API.
import { useState } from 'react';
import { Bar, BarChart, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../services/api';
import { data, hoje, moeda, nomeDoMes, periodoDoMes } from '../services/formatadores';
import { useBuscar } from './useBuscar';
import { Carregando, ErroCarregar, Vazio } from './Estados';
import { CampoTexto } from './CampoTexto';

// Cores do design system (SVG do gráfico não lê variáveis CSS em atributos)
const COR_ATUAL = '#1A3A8F';
const COR_ANTERIOR = '#94A3B8';

// Rótulo curto do período: mês cheio → 'Outubro de 2026'; senão '01/10/2026 – 15/10/2026'
function rotuloPeriodo({ inicio, fim }) {
  const mes = inicio.slice(0, 7);
  const cheio = inicio.endsWith('-01') && fim === periodoDoMes(mes).fim;
  return cheio ? nomeDoMes(mes) : `${data(inicio)} – ${data(fim)}`;
}

// Selo de variação: nas saídas, aumento é ruim (vermelho) e redução é boa (verde)
export function Variacao({ valor }) {
  if (valor === null || valor === undefined) return <span className="selo selo-neutro">novo</span>;
  const classe = valor > 0 ? 'selo-saida' : valor < 0 ? 'selo-entrada' : 'selo-neutro';
  const texto = `${valor > 0 ? '+' : ''}${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  return <span className={`selo ${classe}`}>{texto}</span>;
}

export function Relatorios() {
  const [aba, setAba] = useState('categorias');
  const [periodo, setPeriodo] = useState(periodoDoMes(hoje().slice(0, 7)));
  const periodoValido = periodo.inicio && periodo.fim && periodo.inicio <= periodo.fim;

  const consulta = new URLSearchParams(periodo).toString();
  const relatorio = useBuscar(
    (signal) => (periodoValido ? api.get(`/relatorios/${aba}?${consulta}`, { signal }) : Promise.resolve(null)),
    [aba, consulta],
  );
  // Ao trocar de aba, ignora os dados da aba anterior até a nova resposta chegar
  const r = relatorio.dados && (aba === 'categorias' ? 'categorias' in relatorio.dados : 'contas' in relatorio.dados)
    ? relatorio.dados : null;
  const anterior = r?.periodoAnterior;

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1 className="h1">Relatórios</h1>
          <p className="texto-mutado">
            {!r ? 'Escolha o período' : anterior
              ? `${rotuloPeriodo(r.periodo)} comparado com ${rotuloPeriodo(anterior).toLowerCase()}`
              : rotuloPeriodo(r.periodo)}
          </p>
        </div>
        <div className="cabecalho-acoes">
          <CampoTexto rotulo="De" type="date" value={periodo.inicio} onChange={(e) => setPeriodo((p) => ({ ...p, inicio: e.target.value }))} />
          <CampoTexto rotulo="Até" type="date" value={periodo.fim} onChange={(e) => setPeriodo((p) => ({ ...p, fim: e.target.value }))}
            erro={!periodoValido ? 'A data final deve ser igual ou posterior à inicial.' : undefined} />
        </div>
      </div>

      <div className="abas" role="tablist" aria-label="Tipo de relatório">
        {[['categorias', 'Por categoria'], ['fontes-destinos', 'Por fonte/destino']].map(([valor, rotulo]) => (
          <button key={valor} type="button" role="tab" aria-selected={aba === valor}
            className={aba === valor ? 'ativa' : ''} onClick={() => setAba(valor)}>{rotulo}</button>
        ))}
      </div>

      {relatorio.erro ? <div className="card"><ErroCarregar erro={relatorio.erro} aoTentarDeNovo={relatorio.recarregar} /></div>
        : relatorio.carregando && !r ? <div className="card"><Carregando linhas={6} /></div>
          : r && (aba === 'categorias' ? <RelatorioCategorias r={r} /> : <RelatorioFontesDestinos r={r} />)}
    </>
  );
}

function RelatorioCategorias({ r }) {
  const atual = rotuloPeriodo(r.periodo).split(' de ')[0];
  const anterior = rotuloPeriodo(r.periodoAnterior).split(' de ')[0];
  const comGasto = r.categorias.filter((c) => c.total > 0 || c.periodoAnterior > 0);
  const variacaoTotal = r.totalSaidasAnterior > 0
    ? Math.round(((r.totalSaidas - r.totalSaidasAnterior) / r.totalSaidasAnterior) * 1000) / 10 : null;

  if (comGasto.length === 0 && r.entradas.length === 0) {
    return <div className="card"><Vazio titulo="Nenhum lançamento no período" texto="Escolha outro período ou registre lançamentos para ver os relatórios." /></div>;
  }

  return (
    <>
      <div className="relatorio-grade">
        <section className="card">
          <div className="card-cabecalho"><h2 className="h2">Saídas por categoria</h2></div>
          {comGasto.length === 0 ? <Vazio titulo="Nenhuma saída no período" /> : (
            <div style={{ width: '100%', height: Math.max(180, comGasto.length * 52) }}>
              <ResponsiveContainer>
                <BarChart data={comGasto} layout="vertical" margin={{ left: 8, right: 100 }} barGap={2}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="nome" width={110} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => moeda(v)} cursor={{ fill: '#EEF1F5' }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" height={28} />
                  <Bar dataKey="total" name={atual} fill={COR_ATUAL} radius={[0, 4, 4, 0]} barSize={10}>
                    <LabelList dataKey="total" position="right" formatter={(v) => moeda(v)} style={{ fontWeight: 600, fill: '#0F172A' }} />
                  </Bar>
                  <Bar dataKey="periodoAnterior" name={anterior} fill={COR_ANTERIOR} radius={[0, 4, 4, 0]} barSize={6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-cabecalho"><h2 className="h2">Entradas por categoria</h2></div>
          {r.entradas.filter((c) => c.total > 0).length === 0 ? <Vazio titulo="Nenhuma entrada no período" /> : (
            <table className="tabela">
              <thead><tr><th>Categoria</th><th className="direita">Total</th></tr></thead>
              <tbody>
                {r.entradas.filter((c) => c.total > 0).map((c) => (
                  <tr key={c.id}><td>{c.nome}</td><td className="direita dinheiro entrada">{moeda(c.total)}</td></tr>
                ))}
                <tr><td style={{ fontWeight: 600 }}>Total de entradas</td><td className="direita dinheiro">{moeda(r.totalEntradas)}</td></tr>
              </tbody>
            </table>
          )}
        </section>
      </div>

      {comGasto.length > 0 && (
        <section className="card">
          <div className="card-cabecalho"><h2 className="h2">Detalhamento das saídas</h2></div>
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Categoria</th><th className="direita">Total</th><th className="direita">% das saídas</th>
                  <th className="direita">Período anterior</th><th className="direita">Variação</th>
                </tr>
              </thead>
              <tbody>
                {comGasto.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td>
                    <td className="direita dinheiro">{moeda(c.total)}</td>
                    <td className="direita">{c.percentual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%</td>
                    <td className="direita texto-mutado">{moeda(c.periodoAnterior)}</td>
                    <td className="direita"><Variacao valor={c.variacao} /></td>
                  </tr>
                ))}
                <tr>
                  <td style={{ fontWeight: 600 }}>Total de saídas</td>
                  <td className="direita dinheiro">{moeda(r.totalSaidas)}</td>
                  <td className="direita">100,00%</td>
                  <td className="direita dinheiro">{moeda(r.totalSaidasAnterior)}</td>
                  <td className="direita"><Variacao valor={variacaoTotal} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

// Barras horizontais simples (entradas por fonte / saídas por destino)
function BarrasHorizontais({ itens, cor }) {
  return (
    <div style={{ width: '100%', height: Math.max(120, itens.length * 40) }}>
      <ResponsiveContainer>
        <BarChart data={itens} layout="vertical" margin={{ left: 8, right: 100 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="nome" width={130} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => moeda(v)} cursor={{ fill: '#EEF1F5' }} />
          <Bar dataKey="total" name="Total" fill={cor} radius={[0, 4, 4, 0]} barSize={10}>
            <LabelList dataKey="total" position="right" formatter={(v) => moeda(v)} style={{ fontWeight: 600, fill: '#0F172A' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RelatorioFontesDestinos({ r }) {
  if (r.fontes.length === 0 && r.destinos.length === 0) {
    return <div className="card"><Vazio titulo="Nenhum lançamento no período" texto="Escolha outro período ou registre lançamentos para ver os relatórios." /></div>;
  }
  const sinal = (v) => `${v < 0 ? '− ' : '+ '}${moeda(Math.abs(v))}`;

  return (
    <>
      <div className="duas-colunas" style={{ marginBottom: 16 }}>
        <section className="card">
          <div className="card-cabecalho">
            <h2 className="h2">Entradas por fonte</h2>
            <span className="selo selo-entrada">{moeda(r.totalEntradas)}</span>
          </div>
          {r.fontes.length === 0 ? <Vazio titulo="Nenhuma entrada no período" /> : <BarrasHorizontais itens={r.fontes} cor="#15803D" />}
        </section>
        <section className="card">
          <div className="card-cabecalho">
            <h2 className="h2">Saídas por destino</h2>
            <span className="selo selo-saida">{moeda(r.totalSaidas)}</span>
          </div>
          {r.destinos.length === 0 ? <Vazio titulo="Nenhuma saída no período" /> : <BarrasHorizontais itens={r.destinos} cor={COR_ATUAL} />}
        </section>
      </div>

      <section className="card">
        <div className="card-cabecalho"><h2 className="h2">Saldo das contas no período</h2></div>
        {r.contas.length === 0 ? <Vazio titulo="Nenhuma conta cadastrada" texto="Cadastre uma fonte/destino do tipo conta para ver o saldo." /> : (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead><tr><th>Conta</th><th className="direita">Entradas</th><th className="direita">Saídas</th><th className="direita">Saldo</th></tr></thead>
              <tbody>
                {r.contas.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td>
                    <td className="direita dinheiro entrada">{moeda(c.entradas)}</td>
                    <td className="direita dinheiro saida">{moeda(c.saidas)}</td>
                    <td className="direita dinheiro">{sinal(c.saldo)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ fontWeight: 600 }}>Total</td>
                  <td className="direita dinheiro">{moeda(r.totalContas.entradas)}</td>
                  <td className="direita dinheiro">{moeda(r.totalContas.saidas)}</td>
                  <td className="direita dinheiro">{sinal(r.totalContas.saldo)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

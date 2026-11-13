// src/components/Dashboard.jsx
// Resumo do mês: quanto sobra (entradas − saídas), totais e últimos lançamentos.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { corDaCategoria, data, hoje, moeda, nomeDoMes, periodoDoMes, somarMeses } from '../services/formatadores';
import { useBuscar } from './useBuscar';
import { Carregando, ErroCarregar, Vazio } from './Estados';
import { Kpi } from './Kpi';
import { FormLancamento } from './FormLancamento';

export function Dashboard() {
  const { usuario } = useAuth();
  const [mes, setMes] = useState(hoje().slice(0, 7));
  const [novo, setNovo] = useState(false);
  const { inicio, fim } = periodoDoMes(mes);

  const resumo = useBuscar((signal) => api.get(`/lancamentos?inicio=${inicio}&fim=${fim}&porPagina=5`, { signal }), [inicio]);
  const cadastros = useBuscar(
    (signal) => Promise.all([api.get('/categorias', { signal }), api.get('/fontes-destinos', { signal })])
      .then(([categorias, fontes]) => ({ categorias, fontes })),
    [],
  );

  const r = resumo.dados;
  const sobra = r?.totais.saldo ?? 0;
  const primeiroNome = usuario?.nome?.split(' ')[0];

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1 className="h1">Resumo do mês</h1>
          <p className="texto-mutado">Olá, {primeiroNome}. Aqui está como {nomeDoMes(mes).split(' de ')[0].toLowerCase()} está indo.</p>
        </div>
        <div className="cabecalho-acoes">
          <div className="celula-flex">
            <button type="button" className="botao botao-secundario" onClick={() => setMes(somarMeses(mes, -1))} aria-label="Mês anterior">‹</button>
            <span style={{ minWidth: 150, textAlign: 'center', fontWeight: 500 }}>{nomeDoMes(mes)}</span>
            <button type="button" className="botao botao-secundario" onClick={() => setMes(somarMeses(mes, 1))} aria-label="Próximo mês">›</button>
          </div>
          <button type="button" className="botao botao-primario" disabled={!cadastros.dados} onClick={() => setNovo(true)}>+ Novo lançamento</button>
        </div>
      </div>

      {resumo.erro ? <div className="card"><ErroCarregar erro={resumo.erro} aoTentarDeNovo={resumo.recarregar} /></div> : (
        <>
          <div className="kpis">
            <Kpi destaque rotulo={sobra < 0 ? 'Faltou no mês' : 'Sobra no mês'} valor={r ? moeda(sobra) : '—'} dica="Entradas − saídas" />
            <Kpi rotulo="Entradas" valor={r ? moeda(r.totais.entradas) : '—'} corValor={r?.totais.entradas ? 'entrada' : 'texto-mutado'} />
            <Kpi rotulo="Saídas" valor={r ? moeda(r.totais.saidas) : '—'} corValor={r?.totais.saidas ? 'saida' : 'texto-mutado'} />
          </div>

          <section className="card" style={{ paddingBottom: 8 }}>
            <div className="card-cabecalho">
              <h2 className="h2">Últimos lançamentos</h2>
              <Link to="/lancamentos">Ver todos</Link>
            </div>
            {resumo.carregando && !r ? <Carregando linhas={5} />
              : r.itens.length === 0 ? (
                <Vazio titulo="Registre seu primeiro lançamento" texto="Comece pelo seu salário: assim o saldo do mês já aparece aqui.">
                  <button type="button" className="botao botao-primario" onClick={() => setNovo(true)} disabled={!cadastros.dados}>+ Novo lançamento</button>
                </Vazio>
              ) : (
                <table className="tabela">
                  <tbody>
                    {r.itens.map((l) => (
                      <tr key={l.id}>
                        <td style={{ width: 24 }}><span className="ponto" style={{ background: corDaCategoria(l.categoria_id), width: 10, height: 10 }} /></td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{l.descricao}{l.total_parcelas > 1 ? ` — ${l.parcela_atual}/${l.total_parcelas}` : ''}</div>
                          <div className="pequeno texto-mutado">{l.categoria_nome} · {l.fonte_destino_nome} · {data(l.data)}</div>
                        </td>
                        <td className={`direita dinheiro ${l.tipo}`}>{l.tipo === 'entrada' ? '+ ' : '− '}{moeda(l.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </section>
        </>
      )}

      {novo && cadastros.dados && (
        <FormLancamento categorias={cadastros.dados.categorias} fontes={cadastros.dados.fontes}
          aoFechar={() => setNovo(false)} aoSalvar={() => { setNovo(false); resumo.recarregar(); }} />
      )}
    </>
  );
}

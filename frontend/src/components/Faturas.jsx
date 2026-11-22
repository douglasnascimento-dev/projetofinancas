// src/components/Faturas.jsx
// Fatura aberta e previsão das próximas faturas de cada cartão (RF9), com parcelas futuras.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { data, moeda, nomeDoMes } from '../services/formatadores';
import { useBuscar } from './useBuscar';
import { Carregando, ErroCarregar, Vazio } from './Estados';
import { Kpi } from './Kpi';

const diaMes = (iso) => data(iso).slice(0, 5);   // '2026-12-03' → '03/12'

export function Faturas() {
  const resposta = useBuscar((signal) => api.get('/relatorios/faturas?meses=3', { signal }), []);
  const [cartaoId, setCartaoId] = useState(null);
  const [referencia, setReferencia] = useState(null);

  const cartoes = resposta.dados?.cartoes ?? [];
  const cartao = cartoes.find((c) => c.id === cartaoId) ?? cartoes[0];
  const fatura = cartao?.faturas.find((f) => f.referencia === referencia) ?? cartao?.faturas[0];

  const escolherCartao = (id) => { setCartaoId(id); setReferencia(null); };

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1 className="h1">Faturas</h1>
          <p className="texto-mutado">Fatura atual e previsão das próximas, com parcelas futuras</p>
        </div>
      </div>

      {resposta.erro ? <div className="card"><ErroCarregar erro={resposta.erro} aoTentarDeNovo={resposta.recarregar} /></div>
        : resposta.carregando && !resposta.dados ? <div className="card"><Carregando linhas={6} /></div>
          : cartoes.length === 0 ? (
            <div className="card">
              <Vazio titulo="Nenhum cartão de crédito cadastrado" texto="Cadastre um cartão em Fontes e destinos para acompanhar as faturas.">
                <Link to="/fontes-destinos" className="botao botao-primario">Cadastrar cartão</Link>
              </Vazio>
            </div>
          ) : (
            <>
              <div className="abas" role="tablist" aria-label="Cartões">
                {cartoes.map((c) => (
                  <button key={c.id} type="button" role="tab" aria-selected={c.id === cartao.id}
                    className={c.id === cartao.id ? 'ativa' : ''} onClick={() => escolherCartao(c.id)}>{c.nome}</button>
                ))}
              </div>

              <div className="kpis">
                <Kpi rotulo="Limite total" valor={moeda(cartao.limite)} dica={`Fecha dia ${cartao.diaFechamento} · vence dia ${cartao.diaVencimento}`} />
                <Kpi rotulo="Limite utilizado" valor={moeda(cartao.limiteUtilizado)} dica="Inclui todas as parcelas a vencer" />
                <Kpi rotulo="Limite disponível" valor={moeda(cartao.limiteDisponivel)}
                  corValor={cartao.limiteDisponivel < 0 ? 'saida' : 'entrada'}
                  dica={`${Math.max(0, Math.round((cartao.limiteDisponivel / cartao.limite) * 100))}% do limite livre`} />
              </div>

              <div className="faturas-meses">
                {cartao.faturas.map((f) => (
                  <button key={f.referencia} type="button" aria-pressed={f.referencia === fatura.referencia}
                    className={`card fatura-mes ${f.referencia === fatura.referencia ? 'selecionada' : ''}`}
                    onClick={() => setReferencia(f.referencia)}>
                    <span className="fatura-mes-topo">
                      <span>{nomeDoMes(f.referencia).replace(' de ', ' ')}</span>
                      <span className={`selo ${f.situacao === 'aberta' ? 'selo-marca' : 'selo-neutro'}`}>{f.situacao === 'aberta' ? 'Aberta' : 'Prevista'}</span>
                    </span>
                    <span className="kpi-valor">{moeda(f.total)}</span>
                    <span className="pequeno texto-mutado">Fecha {diaMes(f.fechamento)} · Vence {diaMes(f.vencimento)}</span>
                  </button>
                ))}
              </div>

              <section className="card">
                <div className="card-cabecalho">
                  <h2 className="h2">
                    Fatura de {nomeDoMes(fatura.referencia).replace(' de ', '/').toLowerCase()} · {fatura.lancamentos.length} {fatura.lancamentos.length === 1 ? 'item' : 'itens'}
                  </h2>
                  <span className="pequeno" style={{ color: 'var(--brand)', fontWeight: 500 }}>Fecha {diaMes(fatura.fechamento)} · Vence {diaMes(fatura.vencimento)}</span>
                </div>
                {fatura.lancamentos.length === 0 ? <Vazio titulo="Nenhuma compra nesta fatura" /> : (
                  <div className="tabela-rolagem">
                    <table className="tabela">
                      <thead>
                        <tr><th>Compra</th><th>Descrição</th><th>Categoria</th><th>Parcela</th><th className="direita">Valor</th></tr>
                      </thead>
                      <tbody>
                        {fatura.lancamentos.map((l) => (
                          <tr key={l.id}>
                            <td className="texto-mutado">{diaMes(l.data)}</td>
                            <td>{l.descricao}{l.totalParcelas > 1 ? ` — ${l.parcelaAtual}/${l.totalParcelas}` : ''}</td>
                            <td className="texto-secundario">{l.categoria}</td>
                            <td><span className={`selo ${l.totalParcelas > 1 ? 'selo-marca' : 'selo-neutro'}`}>{l.parcelaAtual}/{l.totalParcelas}</span></td>
                            <td className="direita dinheiro">{moeda(l.valor)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td />
                          <td style={{ fontWeight: 600 }}>Total da fatura</td>
                          <td colSpan={3} className="direita dinheiro" style={{ fontSize: 20 }}>{moeda(fatura.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
    </>
  );
}

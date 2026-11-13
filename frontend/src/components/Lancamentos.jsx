// src/components/Lancamentos.jsx
// Lista de lançamentos com filtros (período, tipo, categoria, fonte/destino), totais e paginação.
import { useState } from 'react';
import { api } from '../services/api';
import { corDaCategoria, data, hoje, moeda, nomeDoMes, periodoDoMes, somarMeses } from '../services/formatadores';
import { useBuscar } from './useBuscar';
import { Carregando, ErroCarregar, Vazio } from './Estados';
import { CampoTexto } from './CampoTexto';
import { CampoSelect } from './CampoSelect';
import { Kpi } from './Kpi';
import { FormLancamento } from './FormLancamento';
import { ExcluirLancamento } from './ExcluirLancamento';

const POR_PAGINA = 10;

export function Lancamentos() {
  const [mes, setMes] = useState(hoje().slice(0, 7));
  const [filtros, setFiltros] = useState({ ...periodoDoMes(hoje().slice(0, 7)), tipo: '', categoriaId: '', fonteDestinoId: '' });
  const [pagina, setPagina] = useState(1);
  const [formulario, setFormulario] = useState(null);   // { lancamento? }
  const [excluindo, setExcluindo] = useState(null);

  // Categorias e fontes: para os filtros e o formulário
  const cadastros = useBuscar(
    (signal) => Promise.all([api.get('/categorias', { signal }), api.get('/fontes-destinos', { signal })])
      .then(([categorias, fontes]) => ({ categorias, fontes })),
    [],
  );

  const consulta = new URLSearchParams({ inicio: filtros.inicio, fim: filtros.fim, pagina, porPagina: POR_PAGINA });
  for (const chave of ['tipo', 'categoriaId', 'fonteDestinoId']) if (filtros[chave]) consulta.set(chave, filtros[chave]);
  const lista = useBuscar((signal) => api.get(`/lancamentos?${consulta}`, { signal }), [consulta.toString()]);

  const mudarFiltro = (campo, valor) => { setFiltros((f) => ({ ...f, [campo]: valor })); setPagina(1); };
  const mudarMes = (passo) => {
    const novo = somarMeses(mes, passo);
    setMes(novo);
    setFiltros((f) => ({ ...f, ...periodoDoMes(novo) }));
    setPagina(1);
  };
  const limpar = () => { setFiltros({ ...periodoDoMes(mes), tipo: '', categoriaId: '', fonteDestinoId: '' }); setPagina(1); };
  const aposSalvar = () => { setFormulario(null); setExcluindo(null); lista.recarregar(); };

  const resposta = lista.dados;
  const categorias = cadastros.dados?.categorias ?? [];
  const fontes = cadastros.dados?.fontes ?? [];
  const periodoErro = lista.erro?.campos;

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1 className="h1">Lançamentos</h1>
          <p className="texto-mutado">Todas as movimentações do período</p>
        </div>
        <div className="cabecalho-acoes">
          <div className="celula-flex">
            <button type="button" className="botao botao-secundario" onClick={() => mudarMes(-1)} aria-label="Mês anterior">‹</button>
            <span style={{ minWidth: 150, textAlign: 'center', fontWeight: 500 }}>{nomeDoMes(mes)}</span>
            <button type="button" className="botao botao-secundario" onClick={() => mudarMes(1)} aria-label="Próximo mês">›</button>
          </div>
          <button type="button" className="botao botao-primario" disabled={!cadastros.dados} onClick={() => setFormulario({})}>
            + Novo lançamento
          </button>
        </div>
      </div>

      <section className="card filtros" aria-label="Filtros">
        <CampoTexto rotulo="De" type="date" value={filtros.inicio} onChange={(e) => mudarFiltro('inicio', e.target.value)} erro={periodoErro?.inicio} />
        <CampoTexto rotulo="Até" type="date" value={filtros.fim} onChange={(e) => mudarFiltro('fim', e.target.value)} erro={periodoErro?.fim} />
        <CampoSelect rotulo="Tipo" value={filtros.tipo} onChange={(e) => mudarFiltro('tipo', e.target.value)}>
          <option value="">Todos</option><option value="entrada">Entradas</option><option value="saida">Saídas</option>
        </CampoSelect>
        <CampoSelect rotulo="Categoria" value={filtros.categoriaId} onChange={(e) => mudarFiltro('categoriaId', e.target.value)}>
          <option value="">Todas</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tipo === 'saida' ? 'saída' : 'entrada'})</option>)}
        </CampoSelect>
        <CampoSelect rotulo="Fonte/destino" value={filtros.fonteDestinoId} onChange={(e) => mudarFiltro('fonteDestinoId', e.target.value)}>
          <option value="">Todas</option>
          {fontes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </CampoSelect>
        <button type="button" className="botao botao-secundario" onClick={limpar}>Limpar filtros</button>
      </section>

      <div className="kpis">
        <Kpi rotulo="Entradas no período" valor={resposta ? moeda(resposta.totais.entradas) : '—'} corValor="entrada" />
        <Kpi rotulo="Saídas no período" valor={resposta ? moeda(resposta.totais.saidas) : '—'} corValor="saida" />
        <Kpi rotulo="Saldo do período" valor={resposta ? moeda(resposta.totais.saldo) : '—'} dica="Entradas − saídas"
          corValor={resposta && resposta.totais.saldo < 0 ? 'saida' : ''} />
      </div>

      <section className="card" style={{ paddingBottom: 8 }}>
        <div className="card-cabecalho">
          <h2 className="h2">{resposta ? `${resposta.quantidade} lançamento(s)` : 'Lançamentos'}</h2>
        </div>
        {lista.carregando && !resposta ? <Carregando linhas={8} />
          : lista.erro ? <ErroCarregar erro={lista.erro} aoTentarDeNovo={lista.recarregar} />
            : resposta.itens.length === 0 ? (
              <Vazio titulo="Nenhum lançamento encontrado" texto="Mude o período ou os filtros, ou registre um novo lançamento.">
                <button type="button" className="botao botao-primario" onClick={() => setFormulario({})}>+ Novo lançamento</button>
              </Vazio>
            ) : (
              <div className="tabela-rolagem" style={{ opacity: lista.carregando ? 0.6 : 1 }}>
                <table className="tabela">
                  <thead>
                    <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Fonte/destino</th><th>Tipo</th><th className="direita">Valor</th><th className="direita">Ações</th></tr>
                  </thead>
                  <tbody>
                    {resposta.itens.map((l) => (
                      <tr key={l.id}>
                        <td className="texto-mutado">{data(l.data)}</td>
                        <td>
                          <span className="celula-flex" style={{ fontWeight: 500 }}>
                            {l.descricao}
                            {l.total_parcelas > 1 && <span className="selo selo-neutro">{l.parcela_atual}/{l.total_parcelas}</span>}
                          </span>
                        </td>
                        <td><span className="celula-flex texto-secundario"><span className="ponto" style={{ background: corDaCategoria(l.categoria_id) }} />{l.categoria_nome}</span></td>
                        <td className="texto-secundario">{l.fonte_destino_nome}</td>
                        <td><span className={`selo ${l.tipo === 'entrada' ? 'selo-entrada' : 'selo-saida'}`}>{l.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                        <td className={`direita dinheiro ${l.tipo}`}>{l.tipo === 'entrada' ? '+ ' : '− '}{moeda(l.valor)}</td>
                        <td className="direita">
                          <span className="acoes">
                            <button type="button" className="link-acao" onClick={() => setFormulario({ lancamento: l })}>Editar</button>
                            <button type="button" className="link-acao perigo" onClick={() => setExcluindo(l)}>Excluir</button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </section>

      {resposta && resposta.totalPaginas > 1 && (
        <nav className="paginacao" aria-label="Paginação">
          <span className="pequeno texto-mutado">
            Mostrando {(resposta.pagina - 1) * POR_PAGINA + 1}–{Math.min(resposta.pagina * POR_PAGINA, resposta.quantidade)} de {resposta.quantidade}
          </span>
          <div className="paginacao-paginas">
            <button type="button" className="botao botao-secundario" disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
            {Array.from({ length: resposta.totalPaginas }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" className={`pagina ${n === pagina ? 'atual' : ''}`} aria-current={n === pagina ? 'page' : undefined}
                onClick={() => setPagina(n)}>{n}</button>
            ))}
            <button type="button" className="botao botao-secundario" disabled={pagina === resposta.totalPaginas} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
          </div>
        </nav>
      )}

      {formulario && cadastros.dados && (
        <FormLancamento lancamento={formulario.lancamento} categorias={categorias} fontes={fontes}
          aoFechar={() => setFormulario(null)} aoSalvar={aposSalvar} />
      )}
      {excluindo && <ExcluirLancamento lancamento={excluindo} aoFechar={() => setExcluindo(null)} aoExcluir={aposSalvar} />}
    </>
  );
}

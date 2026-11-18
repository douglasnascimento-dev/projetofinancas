// src/components/Categorias.jsx
// CRUD de categorias, separadas em saídas e entradas.
import { useState } from 'react';
import { api } from '../services/api';
import { corDaCategoria, hoje, moeda, periodoDoMes } from '../services/formatadores';
import { useBuscar } from './useBuscar';
import { Carregando, ErroCarregar, Vazio } from './Estados';
import { Modal } from './Sobreposicao';
import { CampoTexto } from './CampoTexto';
import { CampoSelect } from './CampoSelect';

function FormCategoria({ categoria, tipoPadrao, aoFechar, aoSalvar }) {
  const [nome, setNome] = useState(categoria?.nome ?? '');
  const [tipo, setTipo] = useState(categoria?.tipo ?? tipoPadrao);
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return setErros({ nome: 'Informe o nome.' });
    try {
      setEnviando(true);
      if (categoria) await api.put(`/categorias/${categoria.id}`, { nome, tipo });
      else await api.post('/categorias', { nome, tipo });
      aoSalvar();
    } catch (erro) {
      setErros(Object.keys(erro.campos).length ? erro.campos : { nome: erro.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={categoria ? 'Editar categoria' : 'Nova categoria'} aoFechar={aoFechar}>
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <CampoTexto rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} maxLength={60} autoFocus />
        <CampoSelect rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} erro={erros.tipo}>
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </CampoSelect>
        <div className="acoes-rodape">
          <button type="button" className="botao botao-secundario" onClick={aoFechar}>Cancelar</button>
          <button type="submit" className="botao botao-primario" disabled={enviando}>Salvar</button>
        </div>
      </form>
    </Modal>
  );
}

function MoverEExcluir({ categoria, opcoes, aoFechar, aoConcluir }) {
  const [destino, setDestino] = useState(opcoes[0]?.id ?? '');
  const [erro, setErro] = useState(null);

  const confirmar = async () => {
    try {
      await api.delete(`/categorias/${categoria.id}?moverPara=${destino}`);
      aoConcluir();
    } catch (e) {
      setErro(e.campos?.moverPara ?? e.message);
    }
  };

  return (
    <Modal titulo={`Excluir "${categoria.nome}"`} aoFechar={aoFechar}>
      <p className="texto-secundario">
        Esta categoria tem {categoria.lancamentos} lançamento(s). Escolha para qual categoria eles vão antes de excluir.
      </p>
      {opcoes.length === 0 ? (
        <p className="saida">Não há outra categoria do mesmo tipo. Crie uma antes de excluir esta.</p>
      ) : (
        <CampoSelect rotulo="Mover lançamentos para" value={destino} onChange={(e) => setDestino(e.target.value)} erro={erro}>
          {opcoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </CampoSelect>
      )}
      <div className="acoes-rodape">
        <button type="button" className="botao botao-secundario" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="botao botao-perigo" disabled={!opcoes.length} onClick={confirmar}>Mover e excluir</button>
      </div>
    </Modal>
  );
}

function TabelaCategorias({ titulo, tipo, categorias, aoEditar, aoExcluir }) {
  return (
    <section className="card" style={{ paddingBottom: 8 }}>
      <div className="card-cabecalho">
        <h2 className="h2">{titulo}</h2>
        <span className={`selo ${tipo === 'saida' ? 'selo-saida' : 'selo-entrada'}`}>{categorias.length} categorias</span>
      </div>
      {categorias.length === 0 ? (
        <Vazio titulo="Nenhuma categoria" texto="Crie uma categoria para classificar seus lançamentos." />
      ) : (
        <table className="tabela">
          <thead>
            <tr><th>Nome</th><th className="direita">Lanç. no mês</th><th className="direita">Total no mês</th><th className="direita">Ações</th></tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id}>
                <td><span className="celula-flex"><span className="ponto" style={{ background: corDaCategoria(c.id) }} />{c.nome}</span></td>
                <td className="direita texto-mutado">{c.lancamentos_periodo}</td>
                <td className={`direita dinheiro ${tipo === 'entrada' ? 'entrada' : ''}`}>{moeda(c.total_periodo)}</td>
                <td className="direita">
                  <span className="acoes">
                    <button type="button" className="link-acao" onClick={() => aoEditar(c)}>Editar</button>
                    <button type="button" className="link-acao perigo" onClick={() => aoExcluir(c)}>Excluir</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function Categorias() {
  const periodo = periodoDoMes(hoje().slice(0, 7));
  const { dados, carregando, erro, recarregar } = useBuscar(
    (signal) => api.get(`/categorias?inicio=${periodo.inicio}&fim=${periodo.fim}`, { signal }),
    [periodo.inicio],
  );
  const [formulario, setFormulario] = useState(null);       // { categoria? }
  const [mover, setMover] = useState(null);                 // categoria em uso
  const [alerta, setAlerta] = useState(null);

  const excluir = async (categoria) => {
    if (!window.confirm(`Excluir a categoria "${categoria.nome}"?`)) return;
    try {
      await api.delete(`/categorias/${categoria.id}`);
      setAlerta(null);
      recarregar();
    } catch (e) {
      if (e.status === 409) setAlerta({ categoria, titulo: e.message, texto: e.campos?.categoria });
      else setAlerta({ titulo: e.message });
    }
  };

  const categorias = dados ?? [];
  const saidas = categorias.filter((c) => c.tipo === 'saida');
  const entradas = categorias.filter((c) => c.tipo === 'entrada');

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1 className="h1">Categorias</h1>
          <p className="texto-mutado">Organize seus lançamentos por tipo</p>
        </div>
        <button type="button" className="botao botao-primario" onClick={() => setFormulario({})}>+ Nova categoria</button>
      </div>

      {alerta && (
        <div className="alerta alerta-erro alerta-linha" role="alert">
          <div>
            <strong>{alerta.titulo}</strong>
            {alerta.texto && <p className="pequeno texto-secundario">{alerta.texto}</p>}
          </div>
          {alerta.categoria && (
            <button type="button" className="botao botao-secundario" onClick={() => { setMover(alerta.categoria); setAlerta(null); }}>
              Mover lançamentos
            </button>
          )}
        </div>
      )}

      {carregando && !dados ? <div className="card"><Carregando linhas={6} /></div>
        : erro ? <div className="card"><ErroCarregar erro={erro} aoTentarDeNovo={recarregar} /></div>
          : (
            <div className="duas-colunas">
              <TabelaCategorias titulo="Saídas" tipo="saida" categorias={saidas} aoEditar={(c) => setFormulario({ categoria: c })} aoExcluir={excluir} />
              <TabelaCategorias titulo="Entradas" tipo="entrada" categorias={entradas} aoEditar={(c) => setFormulario({ categoria: c })} aoExcluir={excluir} />
            </div>
          )}

      {formulario && (
        <FormCategoria categoria={formulario.categoria} tipoPadrao="saida" aoFechar={() => setFormulario(null)}
          aoSalvar={() => { setFormulario(null); recarregar(); }} />
      )}
      {mover && (
        <MoverEExcluir categoria={mover} opcoes={categorias.filter((c) => c.tipo === mover.tipo && c.id !== mover.id)}
          aoFechar={() => setMover(null)} aoConcluir={() => { setMover(null); recarregar(); }} />
      )}
    </>
  );
}

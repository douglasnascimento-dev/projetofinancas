// src/components/FontesDestinos.jsx
// CRUD de fontes e destinos: renda, conta (com opção de reserva) e cartão de crédito.
import { useState } from 'react';
import { api } from '../services/api';
import { lerMoeda, mascaraMoeda, moeda, numeroParaMascara } from '../services/formatadores';
import { useBuscar } from './useBuscar';
import { Carregando, ErroCarregar, Vazio } from './Estados';
import { Modal } from './Sobreposicao';
import { CampoTexto } from './CampoTexto';
import { CampoSelect } from './CampoSelect';

const TIPOS = { renda: ['Renda', 'selo-entrada'], conta: ['Conta', 'selo-neutro'], cartao_credito: ['Cartão de crédito', 'selo-marca'] };

function FormFonte({ fonte, aoFechar, aoSalvar }) {
  const [dados, setDados] = useState({
    nome: fonte?.nome ?? '',
    tipo: fonte?.tipo ?? 'conta',
    diaFechamento: fonte?.dia_fechamento ?? '',
    diaVencimento: fonte?.dia_vencimento ?? '',
    limite: fonte?.limite ? numeroParaMascara(fonte.limite) : '',
    reserva: fonte?.reserva ?? false,
  });
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const alterar = (campo, valor) => setDados((d) => ({ ...d, [campo]: valor }));
  const cartao = dados.tipo === 'cartao_credito';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const corpo = {
      nome: dados.nome,
      tipo: dados.tipo,
      diaFechamento: cartao ? (dados.diaFechamento === '' ? null : Number(dados.diaFechamento)) : null,
      diaVencimento: cartao ? (dados.diaVencimento === '' ? null : Number(dados.diaVencimento)) : null,
      limite: cartao ? lerMoeda(dados.limite) : null,
      reserva: dados.tipo === 'conta' && dados.reserva,
    };
    try {
      setEnviando(true);
      if (fonte) await api.put(`/fontes-destinos/${fonte.id}`, corpo);
      else await api.post('/fontes-destinos', corpo);
      aoSalvar();
    } catch (erro) {
      setErros(Object.keys(erro.campos).length ? erro.campos : { nome: erro.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={fonte ? 'Editar fonte/destino' : 'Nova fonte/destino'} aoFechar={aoFechar}>
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <CampoTexto rotulo="Nome" value={dados.nome} onChange={(e) => alterar('nome', e.target.value)} erro={erros.nome} maxLength={60} autoFocus />
        <CampoSelect rotulo="Tipo" value={dados.tipo} onChange={(e) => alterar('tipo', e.target.value)} erro={erros.tipo}>
          <option value="conta">Conta (corrente, poupança, dinheiro…)</option>
          <option value="renda">Renda (salário, freelance…)</option>
          <option value="cartao_credito">Cartão de crédito</option>
        </CampoSelect>
        {cartao && (
          <>
            <div className="linha-campos">
              <CampoTexto rotulo="Dia de fechamento" inputMode="numeric" value={dados.diaFechamento}
                onChange={(e) => alterar('diaFechamento', e.target.value.replace(/\D/g, '').slice(0, 2))} erro={erros.diaFechamento} />
              <CampoTexto rotulo="Dia de vencimento" inputMode="numeric" value={dados.diaVencimento}
                onChange={(e) => alterar('diaVencimento', e.target.value.replace(/\D/g, '').slice(0, 2))} erro={erros.diaVencimento} />
            </div>
            <CampoTexto rotulo="Limite (R$)" inputMode="numeric" placeholder="0,00" value={dados.limite}
              onChange={(e) => alterar('limite', mascaraMoeda(e.target.value))} erro={erros.limite}
              ajuda="Fechamento, vencimento e limite são obrigatórios para cartão de crédito." />
          </>
        )}
        {dados.tipo === 'conta' && (
          <label className="celula-flex texto-secundario" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={dados.reserva} onChange={(e) => alterar('reserva', e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
            Usar como reserva de emergência
          </label>
        )}
        <div className="acoes-rodape">
          <button type="button" className="botao botao-secundario" onClick={aoFechar}>Cancelar</button>
          <button type="submit" className="botao botao-primario" disabled={enviando}>Salvar</button>
        </div>
      </form>
    </Modal>
  );
}

export function FontesDestinos() {
  const { dados, carregando, erro, recarregar } = useBuscar((signal) => api.get('/fontes-destinos', { signal }), []);
  const [formulario, setFormulario] = useState(null);
  const [alerta, setAlerta] = useState(null);

  const excluir = async (fonte) => {
    if (!window.confirm(`Excluir "${fonte.nome}"?`)) return;
    try {
      await api.delete(`/fontes-destinos/${fonte.id}`);
      setAlerta(null);
      recarregar();
    } catch (e) {
      setAlerta({ titulo: e.message, texto: e.campos?.fonteDestino });
    }
  };

  const fontes = dados ?? [];

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1 className="h1">Fontes e destinos</h1>
          <p className="texto-mutado">De onde o dinheiro vem e para onde ele vai</p>
        </div>
        <button type="button" className="botao botao-primario" onClick={() => setFormulario({})}>+ Nova fonte/destino</button>
      </div>

      {alerta && (
        <div className="alerta alerta-erro alerta-linha" role="alert">
          <div>
            <strong>{alerta.titulo}</strong>
            {alerta.texto && <p className="pequeno texto-secundario">{alerta.texto}</p>}
          </div>
          <button type="button" className="botao botao-secundario" onClick={() => setAlerta(null)}>Entendi</button>
        </div>
      )}

      <section className="card" style={{ paddingBottom: 8 }}>
        <div className="card-cabecalho"><h2 className="h2">{fontes.length} cadastradas</h2></div>
        {carregando && !dados ? <Carregando linhas={6} />
          : erro ? <ErroCarregar erro={erro} aoTentarDeNovo={recarregar} />
            : fontes.length === 0 ? <Vazio titulo="Nenhuma fonte ou destino" texto="Cadastre suas contas, rendas e cartões." />
              : (
                <div className="tabela-rolagem">
                  <table className="tabela">
                    <thead>
                      <tr><th>Nome</th><th>Tipo</th><th>Fechamento</th><th>Vencimento</th><th className="direita">Limite</th><th className="direita">Lanç.</th><th className="direita">Ações</th></tr>
                    </thead>
                    <tbody>
                      {fontes.map((f) => (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 500 }}>{f.nome}</td>
                          <td>
                            <span className="celula-flex">
                              <span className={`selo ${TIPOS[f.tipo][1]}`}>{TIPOS[f.tipo][0]}</span>
                              {f.reserva && <span className="selo selo-entrada">Reserva</span>}
                            </span>
                          </td>
                          <td className="texto-secundario">{f.dia_fechamento ? `Dia ${f.dia_fechamento}` : '—'}</td>
                          <td className="texto-secundario">{f.dia_vencimento ? `Dia ${f.dia_vencimento}` : '—'}</td>
                          <td className="direita dinheiro">{f.limite ? moeda(f.limite) : '—'}</td>
                          <td className="direita texto-mutado">{f.lancamentos}</td>
                          <td className="direita">
                            <span className="acoes">
                              <button type="button" className="link-acao" onClick={() => setFormulario({ fonte: f })}>Editar</button>
                              <button type="button" className="link-acao perigo" onClick={() => excluir(f)}>Excluir</button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
      </section>

      {formulario && (
        <FormFonte fonte={formulario.fonte} aoFechar={() => setFormulario(null)}
          aoSalvar={() => { setFormulario(null); recarregar(); }} />
      )}
    </>
  );
}

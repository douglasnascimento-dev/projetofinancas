// src/components/ExcluirLancamento.jsx
// Confirmação de exclusão. Se for uma parcela, pergunta: só esta ou todas as parcelas da compra?
import { useState } from 'react';
import { api } from '../services/api';
import { moeda } from '../services/formatadores';
import { Modal } from './Sobreposicao';

export function ExcluirLancamento({ lancamento, aoFechar, aoExcluir }) {
  const parcelado = lancamento.total_parcelas > 1;
  const [todas, setTodas] = useState(false);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    try {
      setEnviando(true);
      await api.delete(`/lancamentos/${lancamento.id}${todas ? '?todasParcelas=true' : ''}`);
      aoExcluir();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  };

  const nome = `${lancamento.descricao}${parcelado ? ` — ${lancamento.parcela_atual}/${lancamento.total_parcelas}` : ''}`;

  return (
    <Modal titulo={parcelado ? 'Excluir parcela' : 'Excluir lançamento'} aoFechar={aoFechar}>
      <p className="texto-secundario">
        {parcelado
          ? `“${nome}” faz parte de uma compra parcelada em ${lancamento.total_parcelas}x no ${lancamento.fonte_destino_nome}. O que você quer excluir?`
          : `Excluir “${nome}” (${moeda(lancamento.valor)})? Esta ação não pode ser desfeita.`}
      </p>

      {parcelado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="opcao">
            <input type="radio" name="escopo" checked={!todas} onChange={() => setTodas(false)} />
            <span><strong style={{ fontWeight: 500 }}>Só esta parcela</strong><br />
              <span className="pequeno texto-mutado">{lancamento.parcela_atual}/{lancamento.total_parcelas} · {moeda(lancamento.valor)}</span></span>
          </label>
          <label className="opcao">
            <input type="radio" name="escopo" checked={todas} onChange={() => setTodas(true)} />
            <span><strong style={{ fontWeight: 500 }}>Todas as parcelas da compra</strong><br />
              <span className="pequeno texto-mutado">{lancamento.total_parcelas} parcelas</span></span>
          </label>
        </div>
      )}

      {erro && <p className="saida" role="alert">{erro}</p>}

      <div className="acoes-rodape">
        <button type="button" className="botao botao-secundario" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="botao botao-perigo" onClick={confirmar} disabled={enviando}>
          {parcelado ? (todas ? 'Excluir todas' : 'Excluir parcela') : 'Excluir'}
        </button>
      </div>
    </Modal>
  );
}

// src/components/FormLancamento.jsx
// Painel lateral para criar ou editar um lançamento, com prévia das parcelas no cartão.
import { useMemo, useState } from 'react';
import { api } from '../services/api';
import { dividirEmParcelas, hoje, lerMoeda, mascaraMoeda, moeda, numeroParaMascara } from '../services/formatadores';
import { Painel } from './Sobreposicao';
import { CampoTexto } from './CampoTexto';
import { CampoSelect } from './CampoSelect';

export function FormLancamento({ lancamento, categorias, fontes, aoFechar, aoSalvar }) {
  const editando = Boolean(lancamento);
  const [dados, setDados] = useState({
    tipo: lancamento?.tipo ?? 'saida',
    descricao: lancamento?.descricao ?? '',
    valor: lancamento ? numeroParaMascara(lancamento.valor) : '',
    data: lancamento?.data ?? hoje(),
    categoriaId: lancamento?.categoria_id ?? '',
    fonteDestinoId: lancamento?.fonte_destino_id ?? '',
    parcelas: 1,
  });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo, valor) => setDados((d) => ({ ...d, [campo]: valor }));
  const mudarTipo = (tipo) => setDados((d) => ({ ...d, tipo, categoriaId: '', parcelas: 1 }));

  // Só aparecem categorias do mesmo tipo do lançamento
  const categoriasDoTipo = categorias.filter((c) => c.tipo === dados.tipo);
  const fonte = fontes.find((f) => f.id === Number(dados.fonteDestinoId));
  const podeParcelar = !editando && dados.tipo === 'saida' && fonte?.tipo === 'cartao_credito';
  const parcelas = podeParcelar ? Number(dados.parcelas) : 1;
  const valorNumero = lerMoeda(dados.valor);

  const previa = useMemo(
    () => (parcelas > 1 && valorNumero > 0 ? dividirEmParcelas(valorNumero, parcelas) : []),
    [parcelas, valorNumero],
  );

  const validar = () => {
    const e = {};
    if (!dados.descricao.trim()) e.descricao = 'Informe a descrição.';
    if (!(valorNumero > 0)) e.valor = 'O valor deve ser maior que zero.';
    if (!dados.data) e.data = 'Informe a data.';
    if (!dados.categoriaId) e.categoriaId = 'Escolha a categoria.';
    if (!dados.fonteDestinoId) e.fonteDestinoId = 'Escolha a fonte/destino.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const novosErros = validar();
    setErros(novosErros);
    setErroGeral(null);
    if (Object.keys(novosErros).length) return;

    const corpo = {
      tipo: dados.tipo,
      descricao: dados.descricao,
      valor: valorNumero,
      data: dados.data,
      categoriaId: Number(dados.categoriaId),
      fonteDestinoId: Number(dados.fonteDestinoId),
      parcelas,
    };
    try {
      setEnviando(true);
      if (editando) await api.put(`/lancamentos/${lancamento.id}`, corpo);
      else await api.post('/lancamentos', corpo);
      aoSalvar();
    } catch (erro) {
      setErros(erro.campos ?? {});
      setErroGeral(erro.message);
    } finally {
      setEnviando(false);
    }
  };

  const rotuloFonte = (f) => (f.tipo === 'cartao_credito' ? `${f.nome} · cartão de crédito` : f.nome);

  return (
    <Painel
      titulo={editando ? 'Editar lançamento' : 'Novo lançamento'}
      aoFechar={aoFechar}
      rodape={(
        <>
          <button type="button" className="botao botao-secundario" onClick={aoFechar}>Cancelar</button>
          <button type="submit" form="form-lancamento" className="botao botao-primario" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Salvar lançamento'}
          </button>
        </>
      )}
    >
      <form id="form-lancamento" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {editando && lancamento.total_parcelas > 1 && (
          <div className="alerta alerta-info pequeno">
            Parcela {lancamento.parcela_atual}/{lancamento.total_parcelas}: a edição vale só para esta parcela.
          </div>
        )}
        {erroGeral && Object.keys(erros).length === 0 && (
          <div className="alerta alerta-erro" role="alert"><strong>{erroGeral}</strong></div>
        )}

        <div className="segmentado" role="group" aria-label="Tipo do lançamento">
          {[['entrada', 'Entrada'], ['saida', 'Saída']].map(([valor, rotulo]) => (
            <button key={valor} type="button" aria-pressed={dados.tipo === valor}
              className={dados.tipo === valor ? `ativo ${valor}` : ''} onClick={() => mudarTipo(valor)}>
              {rotulo}
            </button>
          ))}
        </div>

        <CampoTexto rotulo="Descrição" value={dados.descricao} maxLength={120}
          onChange={(e) => alterar('descricao', e.target.value)} erro={erros.descricao} />

        <div className="linha-campos">
          <CampoTexto rotulo={parcelas > 1 ? 'Valor total (R$)' : 'Valor (R$)'} inputMode="numeric" placeholder="0,00"
            value={dados.valor} onChange={(e) => alterar('valor', mascaraMoeda(e.target.value))} erro={erros.valor} />
          <CampoTexto rotulo={podeParcelar ? 'Data da compra' : 'Data'} type="date" value={dados.data}
            onChange={(e) => alterar('data', e.target.value)} erro={erros.data} />
        </div>

        <CampoSelect rotulo="Categoria" value={dados.categoriaId} onChange={(e) => alterar('categoriaId', e.target.value)}
          erro={erros.categoriaId} ajuda={`Só aparecem categorias de ${dados.tipo === 'saida' ? 'saída' : 'entrada'}.`}>
          <option value="">Escolha…</option>
          {categoriasDoTipo.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </CampoSelect>

        <CampoSelect rotulo={dados.tipo === 'saida' ? 'Destino' : 'Fonte'} value={dados.fonteDestinoId}
          onChange={(e) => alterar('fonteDestinoId', e.target.value)} erro={erros.fonteDestinoId}>
          <option value="">Escolha…</option>
          {fontes.map((f) => <option key={f.id} value={f.id}>{rotuloFonte(f)}</option>)}
        </CampoSelect>

        {podeParcelar && (
          <CampoSelect rotulo="Parcelas" value={dados.parcelas} onChange={(e) => alterar('parcelas', e.target.value)}
            erro={erros.parcelas} ajuda="Disponível para cartão de crédito (1 a 48x).">
            {Array.from({ length: 48 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? 'À vista (1x)' : `${n}x${valorNumero > 0 ? ` de ${moeda(dividirEmParcelas(valorNumero, n)[n - 1])}` : ''}`}
              </option>
            ))}
          </CampoSelect>
        )}

        {previa.length > 0 && (
          <div className="previa" aria-live="polite">
            <div className="previa-linha">
              <strong style={{ fontWeight: 500, flex: 1 }}>Parcelas que serão criadas</strong>
              <span className="pequeno texto-mutado">soma {moeda(valorNumero)}</span>
            </div>
            {previa.slice(0, 3).map((v, i) => (
              <div key={i} className="previa-linha pequeno">
                <span className="selo selo-marca">{i + 1}/{parcelas}</span>
                <span className="texto-secundario">{i === 0 && v !== previa[1] ? 'inclui os centavos do arredondamento' : ''}</span>
                <span className="dinheiro">{moeda(v)}</span>
              </div>
            ))}
            {parcelas > 3 && <span className="pequeno texto-mutado">… mais {parcelas - 3} parcelas</span>}
          </div>
        )}
      </form>
    </Painel>
  );
}

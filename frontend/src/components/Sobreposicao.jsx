// src/components/Sobreposicao.jsx
// Modal (centro) e Painel (lateral direita). Fecham com Esc ou clicando fora.
import { useEffect, useId } from 'react';

function useFecharComEsc(aoFechar) {
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoFechar]);
}

export function Modal({ titulo, aoFechar, children }) {
  const id = useId();
  useFecharComEsc(aoFechar);
  return (
    <div className="sobreposicao" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={id}>
        <h2 id={id} className="h1">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

export function Painel({ titulo, aoFechar, rodape, children }) {
  const id = useId();
  useFecharComEsc(aoFechar);
  return (
    <div className="sobreposicao" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <aside className="painel" role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="painel-cabecalho">
          <h2 id={id} className="h1">{titulo}</h2>
          <button type="button" className="fechar" onClick={aoFechar} aria-label="Fechar">✕</button>
        </div>
        <div className="painel-corpo">{children}</div>
        {rodape && <div className="painel-rodape">{rodape}</div>}
      </aside>
    </div>
  );
}

// src/components/CampoSelect.jsx
// Select com rótulo e mensagem de erro, no mesmo visual do CampoTexto.
import { useId } from 'react';

export function CampoSelect({ rotulo, erro, ajuda, children, ...props }) {
  const id = useId();
  const mensagem = erro || ajuda;
  return (
    <div className={`campo ${erro ? 'campo-erro' : ''}`}>
      <label htmlFor={id}>{rotulo}</label>
      <div className="campo-caixa">
        <select id={id} aria-invalid={Boolean(erro)} aria-describedby={mensagem ? `${id}-ajuda` : undefined} {...props}>
          {children}
        </select>
      </div>
      {mensagem && <span id={`${id}-ajuda`} className="campo-ajuda">{mensagem}</span>}
    </div>
  );
}

// src/components/CampoTexto.jsx
// Campo de formulário com rótulo, texto de ajuda e mensagem de erro (vinda do cliente ou do servidor).
import { useId } from 'react';

export function CampoTexto({ rotulo, erro, ajuda, acao, ...props }) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const mensagem = erro || ajuda;

  return (
    <div className={`campo ${erro ? 'campo-erro' : ''}`}>
      <label htmlFor={id}>{rotulo}</label>
      <div className="campo-caixa">
        <input
          id={id}
          aria-invalid={Boolean(erro)}
          aria-describedby={mensagem ? idAjuda : undefined}
          {...props}
        />
        {acao}
      </div>
      {mensagem && <span id={idAjuda} className="campo-ajuda">{mensagem}</span>}
    </div>
  );
}

// src/components/CampoSenha.jsx
// Campo de senha com o botão "Mostrar/Ocultar".
import { useState } from 'react';
import { CampoTexto } from './CampoTexto';

export function CampoSenha(props) {
  const [visivel, setVisivel] = useState(false);
  return (
    <CampoTexto
      {...props}
      type={visivel ? 'text' : 'password'}
      acao={(
        <button type="button" className="campo-acao" onClick={() => setVisivel((v) => !v)}>
          {visivel ? 'Ocultar' : 'Mostrar'}
        </button>
      )}
    />
  );
}

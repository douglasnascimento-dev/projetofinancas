// src/components/useBuscar.js
// Hook para buscar dados da API com os estados carregando / erro / dados.
// Cancela a requisição anterior se as dependências mudarem (evita resposta "atrasada" sobrescrever a nova).
import { useCallback, useEffect, useState } from 'react';

export function useBuscar(buscar, dependencias) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null });
  const [versao, setVersao] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const buscarMemo = useCallback(buscar, dependencias);

  useEffect(() => {
    const controle = new AbortController();
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }));
    buscarMemo(controle.signal)
      .then((dados) => setEstado({ dados, carregando: false, erro: null }))
      .catch((erro) => {
        if (erro.name !== 'AbortError') setEstado({ dados: null, carregando: false, erro });
      });
    return () => controle.abort();
  }, [buscarMemo, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  return { ...estado, recarregar };
}

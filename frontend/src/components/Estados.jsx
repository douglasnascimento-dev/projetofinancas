// src/components/Estados.jsx
// Estados de carregamento, lista vazia e erro, usados em todas as telas que consomem a API.

export function Carregando({ linhas = 4 }) {
  return (
    <div aria-busy="true" aria-label="Carregando" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 0' }}>
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="esqueleto" style={{ width: `${90 - (i % 3) * 15}%` }} />
      ))}
    </div>
  );
}

export function Vazio({ titulo, texto, children }) {
  return (
    <div className="estado">
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

export function ErroCarregar({ erro, aoTentarDeNovo }) {
  return (
    <div className="estado" role="alert">
      <strong>Não foi possível carregar os dados.</strong>
      <p>{erro?.message}</p>
      {aoTentarDeNovo && (
        <button type="button" className="botao botao-secundario" onClick={aoTentarDeNovo}>Tentar de novo</button>
      )}
    </div>
  );
}

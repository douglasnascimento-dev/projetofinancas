// src/components/AuthLayout.jsx
// Moldura das telas de login e cadastro: painel azul com a marca à esquerda, formulário à direita.
import { Logo } from './Logo';
import './AuthLayout.css';

export function AuthLayout({ children }) {
  return (
    <div className="auth">
      <aside className="auth-marca">
        <div className="auth-logo"><Logo cor="branca" altura={50} /></div>
        <svg className="auth-marca-dagua" viewBox="12 36 157 184" aria-hidden="true">
          <path d="M169.05 62.95A92 92 0 1 0 169.05 193.05L147.13 171.13A61 61 0 1 1 147.13 84.87Z" fillRule="evenodd" />
          <circle cx="104" cy="128" r="38" />
        </svg>
        <div className="auth-mensagem">
          <h1>Saiba quanto sobra no mês e quanto já está comprometido.</h1>
          <p>Registre entradas e saídas, acompanhe seus cartões e veja as próximas faturas antes que elas cheguem.</p>
        </div>
      </aside>
      <main className="auth-form">
        <div className="auth-form-conteudo">{children}</div>
      </main>
    </div>
  );
}

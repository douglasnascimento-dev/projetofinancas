// src/components/Login.jsx
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from './AuthLayout';
import { CampoTexto } from './CampoTexto';
import { CampoSenha } from './CampoSenha';

export function Login() {
  const { login, autenticado } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (autenticado) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const novosErros = {};
    if (!email.trim()) novosErros.email = 'Informe o e-mail.';
    if (!senha) novosErros.senha = 'Informe a senha.';
    setErros(novosErros);
    setErroGeral(null);
    if (Object.keys(novosErros).length) return;

    try {
      setEnviando(true);
      await login(email, senha);
      navigate(location.state?.de ?? '/', { replace: true });
    } catch (erro) {
      setErros(erro.campos ?? {});
      setErroGeral(erro.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-titulo">
        <h1 className="h1">Entrar</h1>
        <p className="texto-mutado">Use o e-mail e a senha que você cadastrou.</p>
      </div>

      {location.state?.sessaoExpirada && !erroGeral && (
        <div className="alerta alerta-erro" role="status">
          <strong>Sua sessão expirou.</strong>
          <span className="pequeno texto-secundario">Entre novamente para continuar.</span>
        </div>
      )}
      {erroGeral && (
        <div className="alerta alerta-erro" role="alert">
          <strong>{erroGeral}</strong>
          <span className="pequeno texto-secundario">Confira os dados e tente novamente.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <CampoTexto rotulo="E-mail" type="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} erro={erros.email} />
        <CampoSenha rotulo="Senha" autoComplete="current-password" value={senha}
          onChange={(e) => setSenha(e.target.value)} erro={erros.senha} />
        <button type="submit" className="botao botao-primario botao-bloco" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="auth-rodape">Ainda não tem conta? <Link to="/cadastro">Criar conta</Link></p>
    </AuthLayout>
  );
}

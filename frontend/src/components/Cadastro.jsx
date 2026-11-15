// src/components/Cadastro.jsx
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mascaraCpf } from '../services/formatadores';
import { AuthLayout } from './AuthLayout';
import { CampoTexto } from './CampoTexto';
import { CampoSenha } from './CampoSenha';

const vazio = { nome: '', email: '', cpf: '', senha: '', confirmacaoSenha: '' };

// Validação no cliente (complementar: a validação que vale é a do servidor)
function validar(dados) {
  const erros = {};
  if (!dados.nome.trim()) erros.nome = 'Informe o nome.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dados.email.trim())) erros.email = 'Informe um e-mail válido.';
  if (dados.cpf.replace(/\D/g, '').length !== 11) erros.cpf = 'Informe os 11 dígitos do CPF.';
  if (dados.senha.length < 8 || !/[A-Za-z]/.test(dados.senha) || !/\d/.test(dados.senha)) {
    erros.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  }
  if (dados.confirmacaoSenha !== dados.senha) erros.confirmacaoSenha = 'As senhas não conferem.';
  return erros;
}

export function Cadastro() {
  const { cadastrar, autenticado } = useAuth();
  const navigate = useNavigate();
  const [dados, setDados] = useState(vazio);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (autenticado) return <Navigate to="/" replace />;

  const alterar = (campo) => (e) => {
    const valor = campo === 'cpf' ? mascaraCpf(e.target.value) : e.target.value;
    setDados((atual) => ({ ...atual, [campo]: valor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const novosErros = validar(dados);
    setErros(novosErros);
    setErroGeral(null);
    if (Object.keys(novosErros).length) return;

    try {
      setEnviando(true);
      await cadastrar(dados);
      navigate('/', { replace: true });
    } catch (erro) {
      // 409/400 do servidor: a mensagem aparece junto ao campo correspondente
      setErros(erro.campos ?? {});
      setErroGeral(erro.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-titulo">
        <h1 className="h1">Criar conta</h1>
        <p className="texto-mutado">Leva menos de um minuto. Já criamos categorias e uma conta corrente para você começar.</p>
      </div>

      {erroGeral && (
        <div className="alerta alerta-erro" role="alert">
          <strong>{erroGeral}</strong>
          <span className="pequeno texto-secundario">Corrija o campo destacado abaixo.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <CampoTexto rotulo="Nome completo" autoComplete="name" value={dados.nome} onChange={alterar('nome')} erro={erros.nome} />
        <CampoTexto rotulo="E-mail" type="email" autoComplete="email" value={dados.email} onChange={alterar('email')} erro={erros.email} />
        <CampoTexto rotulo="CPF" inputMode="numeric" placeholder="000.000.000-00" value={dados.cpf} onChange={alterar('cpf')} erro={erros.cpf} />
        <CampoSenha rotulo="Senha" autoComplete="new-password" value={dados.senha} onChange={alterar('senha')}
          erro={erros.senha} ajuda="Mínimo de 8 caracteres, com letras e números." />
        <CampoSenha rotulo="Confirmar senha" autoComplete="new-password" value={dados.confirmacaoSenha}
          onChange={alterar('confirmacaoSenha')} erro={erros.confirmacaoSenha} />
        <button type="submit" className="botao botao-primario botao-bloco" disabled={enviando}>
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>

      <p className="auth-rodape">Já tem conta? <Link to="/login">Entrar</Link></p>
    </AuthLayout>
  );
}

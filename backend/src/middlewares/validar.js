// src/middlewares/validar.js
// Validação das entradas no servidor (a validação do front-end é só complementar).
import { ErroApi } from './tratarErros.js';
import { cpfValido } from '../models/regras/cpf.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Lê um texto do corpo, removendo espaços e caracteres de controle
export function texto(valor) {
  return typeof valor === 'string' ? valor.replace(/[\u0000-\u001F\u007F]/g, '').trim() : '';
}

// Lança 400 com o formato padrão se houver algum campo inválido
export function falharSeHouverErros(campos) {
  if (Object.keys(campos).length > 0) {
    throw new ErroApi(400, 'Dados inválidos.', campos);
  }
}

export function validarCadastro(req, res, next) {
  const { nome, email, cpf, senha, confirmacaoSenha } = req.body ?? {};
  const campos = {};

  if (!texto(nome)) campos.nome = 'Informe o nome.';
  else if (texto(nome).length > 120) campos.nome = 'O nome deve ter no máximo 120 caracteres.';

  if (!texto(email)) campos.email = 'Informe o e-mail.';
  else if (!EMAIL_REGEX.test(texto(email)) || texto(email).length > 160) campos.email = 'Informe um e-mail válido.';

  if (!texto(cpf)) campos.cpf = 'Informe o CPF.';
  else if (!cpfValido(cpf)) campos.cpf = 'CPF inválido.';

  if (typeof senha !== 'string' || !senha) campos.senha = 'Informe a senha.';
  else if (senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) {
    campos.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
  } else if (senha.length > 72) campos.senha = 'A senha deve ter no máximo 72 caracteres.';

  if (confirmacaoSenha !== undefined && confirmacaoSenha !== senha) {
    campos.confirmacaoSenha = 'As senhas não conferem.';
  }

  falharSeHouverErros(campos);
  next();
}

export function validarLogin(req, res, next) {
  const { email, senha } = req.body ?? {};
  const campos = {};
  if (!texto(email)) campos.email = 'Informe o e-mail.';
  if (typeof senha !== 'string' || !senha) campos.senha = 'Informe a senha.';
  falharSeHouverErros(campos);
  next();
}

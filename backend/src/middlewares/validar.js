// src/middlewares/validar.js
// Validação das entradas no servidor (a validação do front-end é só complementar).
import { ErroApi } from './tratarErros.js';
import { cpfValido } from '../models/regras/cpf.js';
import { dataValida, mesDe } from '../models/regras/datas.js';

const TIPOS_LANCAMENTO = ['entrada', 'saida'];
const TIPOS_FONTE = ['renda', 'conta', 'cartao_credito'];

// Converte um texto/número para inteiro positivo, ou null se não for
export function inteiroPositivo(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 && n <= 2147483647 ? n : null;
}

// Garante que :id da URL é um número; senão, 404 (o recurso "não existe")
export function validarId(req, res, next) {
  const id = inteiroPositivo(req.params.id);
  if (!id) throw new ErroApi(404, 'Registro não encontrado.');
  req.idRecurso = id;
  next();
}

// Valor em reais: positivo, no máximo 2 casas decimais
function valorMonetario(valor) {
  const n = typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor);
  if (!Number.isFinite(n) || n <= 0 || n >= 1e10) return null;
  if (Math.abs(Math.round(n * 100) - n * 100) > 1e-6) return null;
  return Math.round(n * 100) / 100;
}

// Período ?inicio=&fim= (padrão: mês corrente). Coloca em req.periodo.
export function lerPeriodo(req, res, next) {
  const padrao = mesDe();
  const inicio = req.query.inicio ?? padrao.inicio;
  const fim = req.query.fim ?? padrao.fim;
  const campos = {};
  if (!dataValida(inicio)) campos.inicio = 'Data inicial inválida (use AAAA-MM-DD).';
  if (!dataValida(fim)) campos.fim = 'Data final inválida (use AAAA-MM-DD).';
  if (!campos.inicio && !campos.fim && inicio > fim) campos.fim = 'A data final deve ser igual ou posterior à inicial.';
  falharSeHouverErros(campos);
  req.periodo = { inicio, fim };
  next();
}

export function validarCategoria(req, res, next) {
  const nome = texto(req.body?.nome);
  const tipo = req.body?.tipo;
  const campos = {};
  if (!nome) campos.nome = 'Informe o nome.';
  else if (nome.length > 60) campos.nome = 'O nome deve ter no máximo 60 caracteres.';
  if (!TIPOS_LANCAMENTO.includes(tipo)) campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  falharSeHouverErros(campos);
  req.dados = { nome, tipo };
  next();
}

export function validarFonteDestino(req, res, next) {
  const b = req.body ?? {};
  const nome = texto(b.nome);
  const campos = {};
  if (!nome) campos.nome = 'Informe o nome.';
  else if (nome.length > 60) campos.nome = 'O nome deve ter no máximo 60 caracteres.';
  if (!TIPOS_FONTE.includes(b.tipo)) campos.tipo = 'O tipo deve ser "renda", "conta" ou "cartao_credito".';

  const dados = { nome, tipo: b.tipo, diaFechamento: null, diaVencimento: null, limite: null, reserva: false };

  if (b.tipo === 'cartao_credito') {
    // Cartão de crédito: fechamento, vencimento e limite são obrigatórios
    const dia = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 31 ? n : null; };
    dados.diaFechamento = dia(b.diaFechamento);
    dados.diaVencimento = dia(b.diaVencimento);
    dados.limite = valorMonetario(b.limite);
    if (b.diaFechamento === undefined || b.diaFechamento === null || b.diaFechamento === '') campos.diaFechamento = 'Obrigatório para cartão de crédito.';
    else if (!dados.diaFechamento) campos.diaFechamento = 'Informe um dia entre 1 e 31.';
    if (b.diaVencimento === undefined || b.diaVencimento === null || b.diaVencimento === '') campos.diaVencimento = 'Obrigatório para cartão de crédito.';
    else if (!dados.diaVencimento) campos.diaVencimento = 'Informe um dia entre 1 e 31.';
    if (b.limite === undefined || b.limite === null || b.limite === '') campos.limite = 'Obrigatório para cartão de crédito.';
    else if (!dados.limite) campos.limite = 'O limite deve ser maior que zero.';
  } else if (b.tipo === 'conta') {
    dados.reserva = b.reserva === true;
  }

  falharSeHouverErros(campos);
  req.dados = dados;
  next();
}

export function validarLancamento(req, res, next) {
  const b = req.body ?? {};
  const campos = {};
  const descricao = texto(b.descricao);
  const valor = valorMonetario(b.valor);
  const categoriaId = inteiroPositivo(b.categoriaId);
  const fonteDestinoId = inteiroPositivo(b.fonteDestinoId);
  const parcelas = b.parcelas === undefined || b.parcelas === null || b.parcelas === '' ? 1 : Number(b.parcelas);

  if (!TIPOS_LANCAMENTO.includes(b.tipo)) campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  if (!descricao) campos.descricao = 'Informe a descrição.';
  else if (descricao.length > 120) campos.descricao = 'A descrição deve ter no máximo 120 caracteres.';
  if (b.valor === undefined || b.valor === null || b.valor === '') campos.valor = 'Informe o valor.';
  else if (!valor) campos.valor = 'O valor deve ser maior que zero, com no máximo 2 casas decimais.';
  if (!b.data) campos.data = 'Informe a data.';
  else if (!dataValida(b.data)) campos.data = 'Data inválida (use AAAA-MM-DD).';
  if (!categoriaId) campos.categoriaId = 'Informe a categoria.';
  if (!fonteDestinoId) campos.fonteDestinoId = 'Informe a fonte/destino.';
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 48) campos.parcelas = 'O número de parcelas deve ser de 1 a 48.';

  falharSeHouverErros(campos);
  req.dados = { tipo: b.tipo, descricao, valor, data: b.data, categoriaId, fonteDestinoId, parcelas };
  next();
}

// Filtros da listagem de lançamentos (?tipo=&categoriaId=&fonteDestinoId=&pagina=&porPagina=)
export function lerFiltrosLancamentos(req, res, next) {
  const q = req.query;
  const campos = {};
  const filtros = { ...req.periodo, tipo: null, categoriaId: null, fonteDestinoId: null, pagina: 1, porPagina: 10 };

  if (q.tipo) {
    if (TIPOS_LANCAMENTO.includes(q.tipo)) filtros.tipo = q.tipo;
    else campos.tipo = 'O tipo deve ser "entrada" ou "saida".';
  }
  for (const chave of ['categoriaId', 'fonteDestinoId']) {
    if (q[chave]) {
      filtros[chave] = inteiroPositivo(q[chave]);
      if (!filtros[chave]) campos[chave] = 'Id inválido.';
    }
  }
  if (q.pagina) {
    filtros.pagina = inteiroPositivo(q.pagina);
    if (!filtros.pagina) campos.pagina = 'A página deve ser um número a partir de 1.';
  }
  if (q.porPagina) {
    const n = inteiroPositivo(q.porPagina);
    if (!n || n > 100) campos.porPagina = 'porPagina deve ser de 1 a 100.';
    else filtros.porPagina = n;
  }

  falharSeHouverErros(campos);
  req.filtros = filtros;
  next();
}

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

// src/services/api.js
// Ponto único de comunicação com a API: adiciona o token, trata JSON, erros HTTP e erros de rede.

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const CHAVE_TOKEN = 'coin.token';

// Erro com o mesmo formato que a API devolve: { erro, campos }
export class ErroRequisicao extends Error {
  constructor(status, mensagem, campos = {}) {
    super(mensagem);
    this.status = status;
    this.campos = campos;
  }
}

export const tokenStorage = {
  ler: () => localStorage.getItem(CHAVE_TOKEN),
  salvar: (token) => localStorage.setItem(CHAVE_TOKEN, token),
  remover: () => localStorage.removeItem(CHAVE_TOKEN),
};

// O AuthContext registra aqui o que fazer quando a API responder 401 (token ausente/expirado)
let aoNaoAutorizado = () => {};
export function definirAoNaoAutorizado(funcao) {
  aoNaoAutorizado = funcao;
}

export async function requisicao(caminho, opcoes = {}) {
  const token = tokenStorage.ler();
  const headers = {};
  if (opcoes.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      ...opcoes,
      headers,
      body: opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined,
    });
  } catch (erro) {
    if (erro.name === 'AbortError') throw erro;
    throw new ErroRequisicao(0, 'Não foi possível conectar à API. Verifique se o back-end está rodando.');
  }

  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    // 401 numa rota protegida: token inválido/expirado → logout e volta ao login
    if (resposta.status === 401 && token && !caminho.startsWith('/auth/login')) {
      aoNaoAutorizado();
    }
    throw new ErroRequisicao(
      resposta.status,
      dados?.erro ?? `A API respondeu com erro ${resposta.status}.`,
      dados?.campos ?? {},
    );
  }
  return dados;
}

// Atalhos por verbo HTTP
export const api = {
  get: (caminho, opcoes) => requisicao(caminho, { ...opcoes, method: 'GET' }),
  post: (caminho, body) => requisicao(caminho, { method: 'POST', body }),
  put: (caminho, body) => requisicao(caminho, { method: 'PUT', body }),
  delete: (caminho) => requisicao(caminho, { method: 'DELETE' }),
};

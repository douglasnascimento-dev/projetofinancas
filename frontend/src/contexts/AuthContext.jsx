// src/contexts/AuthContext.jsx
// Usuário logado, token e as funções login, logout e cadastrar.
// O token fica no localStorage para sobreviver a um recarregamento da página.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { api, definirAoNaoAutorizado, tokenStorage } from '../services/api';

const estadoInicial = {
  usuario: null,
  token: tokenStorage.ler(),
  verificando: Boolean(tokenStorage.ler()),  // há token salvo: confere com /auth/me antes de liberar as rotas
};

function authReducer(estado, acao) {
  switch (acao.type) {
    case 'LOGIN_SUCESSO':
      return { usuario: acao.usuario, token: acao.token, verificando: false };
    case 'VERIFICACAO_SUCESSO':
      return { ...estado, usuario: acao.usuario, verificando: false };
    case 'LOGOUT':
      return { usuario: null, token: null, verificando: false, sessaoExpirada: Boolean(acao.expirou) };
    default:
      return estado;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [estado, dispatch] = useReducer(authReducer, estadoInicial);

  const logout = useCallback(() => {
    tokenStorage.remover();
    dispatch({ type: 'LOGOUT' });
  }, []);

  // Qualquer 401 vindo da API (token expirado) faz logout; a RotaProtegida leva ao login
  useEffect(() => {
    definirAoNaoAutorizado(() => {
      tokenStorage.remover();
      dispatch({ type: 'LOGOUT', expirou: true });
    });
  }, []);

  // Ao abrir a aplicação com token salvo, busca os dados do usuário
  useEffect(() => {
    if (!estado.verificando) return;
    api.get('/auth/me')
      .then((usuario) => dispatch({ type: 'VERIFICACAO_SUCESSO', usuario }))
      .catch(() => logout());
  }, [estado.verificando, logout]);

  const login = useCallback(async (email, senha) => {
    const { token, usuario } = await api.post('/auth/login', { email, senha });
    tokenStorage.salvar(token);
    dispatch({ type: 'LOGIN_SUCESSO', token, usuario });
    return usuario;
  }, []);

  // Cadastra e já entra na aplicação
  const cadastrar = useCallback(async (dados) => {
    await api.post('/auth/cadastro', dados);
    return login(dados.email, dados.senha);
  }, [login]);

  const valor = useMemo(() => ({
    usuario: estado.usuario,
    token: estado.token,
    verificando: estado.verificando,
    sessaoExpirada: Boolean(estado.sessaoExpirada),
    autenticado: Boolean(estado.token && estado.usuario),
    login,
    logout,
    cadastrar,
  }), [estado, login, logout, cadastrar]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return contexto;
}

// src/components/RotaProtegida.jsx
// Usuário não autenticado é redirecionado ao login (guardando a página que ele tentou abrir).
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function RotaProtegida() {
  const { autenticado, verificando, sessaoExpirada } = useAuth();
  const location = useLocation();

  if (verificando) return <div className="tela-carregando">Carregando…</div>;
  if (!autenticado) {
    return <Navigate to="/login" replace state={{ de: location.pathname, sessaoExpirada }} />;
  }
  return <Outlet />;
}

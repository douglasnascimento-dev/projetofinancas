// src/components/Layout.jsx
// Estrutura das telas logadas: menu lateral com a logo, navegação e usuário.
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';
import './Layout.css';

const MENU = [
  { para: '/', rotulo: 'Dashboard' },
  { para: '/lancamentos', rotulo: 'Lançamentos' },
  { para: '/categorias', rotulo: 'Categorias' },
  { para: '/fontes-destinos', rotulo: 'Fontes e destinos' },
  { para: '/relatorios', rotulo: 'Relatórios' },
  { para: '/faturas', rotulo: 'Faturas' },
  { para: '/saude-financeira', rotulo: 'Saúde financeira' },
];

export function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const sair = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app">
      <aside className="menu">
        <div className="menu-logo"><Logo /></div>
        <nav className="menu-nav" aria-label="Principal">
          {MENU.map((item) => (
            <NavLink key={item.para} to={item.para} end={item.para === '/'}
              className={({ isActive }) => `menu-item ${isActive ? 'ativo' : ''}`}>
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="menu-usuario">
          <strong>{usuario?.nome}</strong>
          <button type="button" className="menu-sair" onClick={sair}>Sair</button>
        </div>
      </aside>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}

// src/App.jsx
// Rotas da aplicação: públicas (login, cadastro) e protegidas (exigem token).
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RotaProtegida } from './components/RotaProtegida';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Cadastro } from './components/Cadastro';
import { EmConstrucao } from './components/EmConstrucao';
import { Dashboard } from './components/Dashboard';
import { Lancamentos } from './components/Lancamentos';
import { Categorias } from './components/Categorias';
import { FontesDestinos } from './components/FontesDestinos';
import { Relatorios } from './components/Relatorios';
import { Faturas } from './components/Faturas';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />

          <Route element={<RotaProtegida />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="lancamentos" element={<Lancamentos />} />
              <Route path="categorias" element={<Categorias />} />
              <Route path="fontes-destinos" element={<FontesDestinos />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="faturas" element={<Faturas />} />
              <Route path="saude-financeira" element={<EmConstrucao titulo="Saúde financeira" />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

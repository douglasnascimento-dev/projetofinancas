// src/App.jsx
// Rotas da aplicação: públicas (login, cadastro) e protegidas (exigem token).
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RotaProtegida } from './components/RotaProtegida';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Cadastro } from './components/Cadastro';
import { EmConstrucao } from './components/EmConstrucao';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />

          <Route element={<RotaProtegida />}>
            <Route element={<Layout />}>
              <Route index element={<EmConstrucao titulo="Resumo do mês" />} />
              <Route path="lancamentos" element={<EmConstrucao titulo="Lançamentos" />} />
              <Route path="categorias" element={<EmConstrucao titulo="Categorias" />} />
              <Route path="fontes-destinos" element={<EmConstrucao titulo="Fontes e destinos" />} />
              <Route path="relatorios" element={<EmConstrucao titulo="Relatórios" />} />
              <Route path="faturas" element={<EmConstrucao titulo="Faturas" />} />
              <Route path="saude-financeira" element={<EmConstrucao titulo="Saúde financeira" />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

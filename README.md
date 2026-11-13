# coIN — Controle Financeiro Pessoal

Projeto 2 da disciplina **Programação Web Full Stack** (Engenharia de Software — UTFPR).
API REST em **Node.js + Express** com **PostgreSQL** e SPA em **React (Vite)**, com autenticação por **JWT**.

> README em construção — será completado ao longo do desenvolvimento.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Back-end | Node.js 20+, Express, pg (PostgreSQL), bcrypt, jsonwebtoken, dotenv, cors, express-rate-limit |
| Front-end | React, Vite, React Router, Recharts |
| Banco | PostgreSQL 16+ |

## Estrutura

```
projetofinancas/
├── backend/
│   ├── database/        schema (01-schema.sql), reset.js e seed.js
│   └── src/
│       ├── server.js
│       ├── config/      pool de conexões, JWT
│       ├── middlewares/ autenticação, validação, erros
│       ├── models/      acesso ao banco (+ models/regras: CPF, parcelas, faturas)
│       └── routes/      rotas + controladores
└── frontend/
    └── src/
        ├── components/  páginas e componentes
        ├── contexts/    AuthContext
        └── services/    cliente HTTP (único ponto de acesso à API)
```

## Como rodar

### 1. Banco de dados

Instale o PostgreSQL (no Windows: `winget install -e --id PostgreSQL.PostgreSQL.17`).

```bash
cd backend
npm install
cp .env.example .env       # ajuste DATABASE_URL e JWT_SECRET
npm run db:reset           # cria o banco "coin" e as tabelas
npm run seed               # 2 usuários + 3 meses de lançamentos
```

Usuários de demonstração: `ana@email.com` e `bruno@email.com`, senha `senha1234`.

### 2. Back-end

```bash
cd backend
npm run dev                # http://localhost:3000
```

### 3. Front-end

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

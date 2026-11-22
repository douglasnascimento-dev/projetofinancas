# coIN — Controle Financeiro Pessoal

Projeto 2 da disciplina **Programação Web Full Stack** (Engenharia de Software — UTFPR).
API REST em **Node.js + Express** com **PostgreSQL** e SPA em **React (Vite)**, com autenticação por **JWT**.

O usuário se cadastra, faz login e registra entradas e saídas, cada uma com uma categoria e uma fonte/destino
(renda, conta ou cartão de crédito). A aplicação gera relatórios por categoria e por fonte/destino, prevê as
faturas dos cartões (com parcelas futuras) e tem uma página de saúde financeira com indicadores e dicas.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Back-end | Node.js 20+, Express 5, pg (PostgreSQL), bcrypt, jsonwebtoken, dotenv, cors, express-rate-limit |
| Front-end | React 19, Vite, React Router, Recharts |
| Banco | PostgreSQL 16+ |
| Testes | `node:test` (regras de negócio) e `npm run checklist` (checklist do enunciado contra a API) |

## Estrutura

```
projetofinancas/
├── backend/
│   ├── .env.example
│   ├── database/        01-schema.sql, reset.js, seed.js e checklist.js
│   └── src/
│       ├── server.js    cria o app Express, registra middlewares e rotas
│       ├── config/      pool de conexões (db.js) e configuração do JWT
│       ├── middlewares/ autenticar (JWT), limitarLogin (rate limit), validar, tratarErros
│       ├── models/      acesso ao banco (Usuario, Categoria, FonteDestino, Lancamento,
│       │                Relatorio, Fatura, SaudeFinanceira)
│       │   └── regras/  funções puras + testes: cpf, datas, parcelas, faturas, saude
│       └── routes/      rotas + controladores (não há pasta controllers)
└── frontend/
    ├── .env.example
    └── src/
        ├── components/  páginas e componentes em JSX
        ├── contexts/    AuthContext (usuário, token, login, logout, cadastrar)
        └── services/    api.js (único ponto de acesso à API) e formatadores
```

**Decisão:** as funções utilitárias puras (`cpfValido`, `dividirEmParcelas`, `calcularFatura`, `calcularSaude`)
ficam em `backend/src/models/regras/`, porque são regras de negócio usadas pelos models. Elas não acessam o banco
e têm testes próprios (`npm test`).

## Como rodar

### 1. Banco de dados

Instale o PostgreSQL (no Windows: `winget install -e --id PostgreSQL.PostgreSQL.17`; no Linux: `sudo apt install postgresql`).

```bash
cd backend
npm install
cp .env.example .env       # ajuste DATABASE_URL e JWT_SECRET
npm run db:reset           # cria o banco "coin" e as tabelas (01-schema.sql)
npm run seed               # 2 usuários + 3 meses de lançamentos
```

Usuários de demonstração: `ana@email.com` e `bruno@email.com`, senha `senha1234`.

### 2. Back-end

```bash
cd backend
npm run dev                # http://localhost:3000
npm test                   # testes das regras (CPF, parcelas, faturas, saúde financeira)
npm run checklist          # com a API no ar: confere o checklist final do enunciado
```

### 3. Front-end

```bash
cd frontend
npm install
cp .env.example .env       # VITE_API_URL=http://localhost:3000/api
npm run dev                # http://localhost:5173
```

### Variáveis de ambiente (`backend/.env`)

| Variável | Exemplo | Uso |
|---|---|---|
| `PORT` | `3000` | Porta da API |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/coin` | Conexão com o PostgreSQL |
| `JWT_SECRET` | texto longo e aleatório | Assinatura dos tokens |
| `JWT_EXPIRES_IN` | `1h` | Validade do token |
| `CORS_ORIGIN` | `http://localhost:5173` | Única origem aceita pelo CORS |

O `.env` não é versionado (está no `.gitignore`); o `.env.example` é.

## Rotas da API

Todas as rotas abaixo de `/api`, exceto cadastro e login, exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Descrição | Respostas |
|---|---|---|---|
| POST | `/api/auth/cadastro` | Cadastra usuário (cria categorias e fonte padrão) | 201, 400, 409 |
| POST | `/api/auth/login` | Autentica e devolve o JWT (máx. 10 tentativas / 15 min) | 200, 400, 401, 429 |
| GET | `/api/auth/me` | Dados do usuário logado | 200, 401 |
| GET, POST | `/api/categorias` | Lista (`?tipo=`) / cria categoria | 200, 201, 400, 409 |
| PUT, DELETE | `/api/categorias/:id` | Edita / exclui (`?moverPara=<id>` move os lançamentos antes) | 200, 204, 400, 404, 409 |
| GET, POST | `/api/fontes-destinos` | Lista / cria fonte ou destino | 200, 201, 400, 409 |
| PUT, DELETE | `/api/fontes-destinos/:id` | Edita / exclui | 200, 204, 400, 404, 409 |
| GET | `/api/lancamentos?inicio=&fim=&tipo=&categoriaId=&fonteDestinoId=&pagina=&porPagina=` | Lista com filtros, paginação e totais (padrão: mês corrente) | 200, 400 |
| POST | `/api/lancamentos` | Cria lançamento; com `parcelas` (1–48) no cartão, gera uma linha por parcela em transação | 201, 400, 404 |
| GET, PUT, DELETE | `/api/lancamentos/:id` | Detalha / edita / exclui (`?todasParcelas=true` exclui a compra inteira) | 200, 204, 400, 404 |
| GET | `/api/relatorios/categorias?inicio=&fim=` | RF7: saídas e entradas por categoria, % e comparação com o período anterior | 200, 400 |
| GET | `/api/relatorios/fontes-destinos?inicio=&fim=` | RF8: entradas por fonte, saídas por destino, saldo das contas | 200, 400 |
| GET | `/api/relatorios/faturas?meses=3` | RF9: fatura aberta + próximas faturas de cada cartão, limite utilizado e disponível | 200, 400 |
| GET | `/api/saude-financeira?meses=3` | Desafio: indicadores, projeção e dicas (`meses` = 3 ou 6) | 200, 400 |

Todas as respostas de erro têm o mesmo formato:

```json
{ "erro": "Dados inválidos.", "campos": { "valor": "O valor deve ser maior que zero." } }
```

## Regras de negócio

- **Unicidade de e-mail e CPF:** garantida por `UNIQUE` no banco (`usuarios_email_unique`, `usuarios_cpf_unique`).
  Antes de gravar, o e-mail vira minúsculo e o CPF fica só com dígitos. A violação (código `23505`) vira **409**
  com o campo duplicado.
- **Isolamento (RF3):** toda consulta filtra por `usuario_id` vindo do token. Registro de outro usuário → **404**.
- **Parcelas:** o valor é dividido em centavos e a sobra vai para a 1ª parcela (R$ 100,00 em 3× → 33,34 + 33,33 + 33,33).
  Todas as parcelas são gravadas numa transação, com o mesmo `grupo_parcelamento`.
- **Dinheiro:** `NUMERIC(12,2)` no banco; nos cálculos o valor é arredondado para centavos.

### Faturas do cartão (RF9)

Regra: uma compra feita **antes** do dia de fechamento entra na fatura que fecha no mesmo mês. Se for feita **no dia
do fechamento ou depois**, entra na do mês seguinte. A parcela *k* cai *k − 1* meses depois da 1ª. Se o vencimento for
maior que o fechamento, a fatura vence no mesmo mês; senão, no mês seguinte. Dias inexistentes (31 em fevereiro) viram
o último dia do mês.

**Escolha de modelagem:** cada parcela guarda a **data da compra**. A fatura em que ela cai é calculada na consulta com
`calcularFatura(data, cartao, parcela_atual)` (`models/regras/faturas.js`). Escolhemos assim para que mudar o dia de
fechamento de um cartão recalcule todas as faturas automaticamente, sem regravar lançamentos.

O **limite utilizado** soma todas as parcelas cuja fatura ainda não venceu (`vencimento >= hoje`).

### Saúde financeira (desafio)

Os cálculos ficam em `models/regras/saude.js` e rodam no back-end. A base das médias são os últimos 3 (ou 6) meses
completos; meses anteriores ao primeiro lançamento do usuário são ignorados.

| Indicador | Cálculo |
|---|---|
| Taxa de poupança | (entradas − saídas) ÷ entradas nos meses base |
| Comprometimento com cartões | média das próximas 3 faturas ÷ renda média mensal |
| Parcelas futuras | soma das parcelas de compras parceladas ainda não vencidas, e até quando vão |
| Reserva de emergência | saldo das contas marcadas como reserva ÷ média de saídas mensais |
| Regra 50/30/20 | Moradia, Saúde, Mobilidade, Educação e Alimentação = necessidades; demais saídas = desejos; poupança = o que sobra. Tudo em % da renda |
| Projeção (6 meses) | renda média − saídas médias não parceladas − parcelas já conhecidas de cada mês |
| Categoria fora da curva | gasto do mês atual na categoria × média dos meses base |

**Regras das dicas** (limites em `LIMITES`, no mesmo arquivo):

| Situação | Dica |
|---|---|
| Categoria ≥ 30% acima da média | Atenção: gastos com a categoria acima da média (até 2 categorias) |
| Próximas faturas ≥ 30% da renda | Atenção: evitar novas compras parceladas |
| Algum mês da projeção negativo | Atenção: o mês pode fechar no negativo |
| Poupança do último mês ≥ 10% | Bom sinal; abaixo de 10%, Atenção com a meta comum |
| Reserva < 3 meses de despesas | Dica: quanto falta para chegar a 3 meses |
| Desejos > 30% da renda | Dica: gastos com desejos acima da referência |
| Há parcelas futuras | Dica: total em parcelas e até quando |

A página informa que **as informações são educativas e não constituem recomendação financeira profissional**.

## Segurança

- Senhas com **bcrypt** (hash + salt); `senha_hash` nunca sai em nenhuma resposta.
- Login com mensagem genérica ("E-mail ou senha inválidos") e **rate limiting** (10 tentativas / 15 min por IP).
- Consultas sempre **parametrizadas** (`$1, $2…`); entradas validadas e limpas no servidor (`middlewares/validar.js`).
- **CORS** restrito à origem do front-end; corpo JSON limitado a 100 kb.
- No front-end, o cliente HTTP (`services/api.js`) envia o token em toda requisição e, ao receber **401**, faz logout e
  volta ao login.

## Checklist final

Com o back-end rodando, `npm run checklist` (em `backend/`) cria dois usuários novos e confere:

- e-mail repetido com outra capitalização e CPF repetido com/sem pontuação → 409 no campo certo;
- nenhuma resposta contém `senha_hash`;
- R$ 100,00 em 3× soma exatamente R$ 100,00;
- compra no dia do fechamento cai na fatura do mês seguinte;
- saída não aceita categoria de entrada;
- o usuário B recebe 404 ao ler, editar ou excluir dados do usuário A;
- sem token ou com token inválido → 401;
- `.env` fora do repositório e `.env.example` versionado.

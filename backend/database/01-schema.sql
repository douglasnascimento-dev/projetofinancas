-- coIN — schema do banco (PostgreSQL)
-- Recria todas as tabelas do zero. Rode com: npm run db:reset

DROP TABLE IF EXISTS lancamentos;
DROP TABLE IF EXISTS fontes_destinos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;

-- Usuários: e-mail e CPF únicos garantidos pelo banco (não só pelo código)
CREATE TABLE usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL,          -- gravado em minúsculas
  cpf         CHAR(11)     NOT NULL,          -- gravado só com dígitos
  senha_hash  VARCHAR(100) NOT NULL,
  criado_em   TIMESTAMP    NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_email_unique UNIQUE (email),
  CONSTRAINT usuarios_cpf_unique   UNIQUE (cpf)
);

-- Categorias: pertencem a um usuário; nome único por usuário e tipo
CREATE TABLE categorias (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER     NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome        VARCHAR(60) NOT NULL,
  tipo        VARCHAR(7)  NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  CONSTRAINT categorias_nome_unique UNIQUE (usuario_id, nome, tipo)
);

-- Fontes e destinos: renda, conta ou cartão de crédito
CREATE TABLE fontes_destinos (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER     NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome            VARCHAR(60) NOT NULL,
  tipo            VARCHAR(14) NOT NULL CHECK (tipo IN ('renda', 'conta', 'cartao_credito')),
  dia_fechamento  SMALLINT CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento  SMALLINT CHECK (dia_vencimento BETWEEN 1 AND 31),
  limite          NUMERIC(12, 2) CHECK (limite > 0),
  reserva         BOOLEAN     NOT NULL DEFAULT FALSE,   -- conta usada como reserva de emergência
  CONSTRAINT fontes_destinos_nome_unique UNIQUE (usuario_id, nome),
  CONSTRAINT fontes_destinos_cartao_check CHECK (
    tipo <> 'cartao_credito'
    OR (dia_fechamento IS NOT NULL AND dia_vencimento IS NOT NULL AND limite IS NOT NULL)
  )
);

-- Lançamentos: valor sempre positivo (o sinal vem do tipo); parcelas compartilham grupo_parcelamento
CREATE TABLE lancamentos (
  id                  SERIAL PRIMARY KEY,
  usuario_id          INTEGER        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo                VARCHAR(7)     NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao           VARCHAR(120)   NOT NULL,
  valor               NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
  data                DATE           NOT NULL,          -- data da compra (igual em todas as parcelas)
  categoria_id        INTEGER        NOT NULL REFERENCES categorias(id),
  fonte_destino_id    INTEGER        NOT NULL REFERENCES fontes_destinos(id),
  parcela_atual       SMALLINT       NOT NULL DEFAULT 1,
  total_parcelas      SMALLINT       NOT NULL DEFAULT 1 CHECK (total_parcelas BETWEEN 1 AND 48),
  grupo_parcelamento  UUID,
  criado_em           TIMESTAMP      NOT NULL DEFAULT NOW(),
  CHECK (parcela_atual BETWEEN 1 AND total_parcelas)
);

CREATE INDEX idx_lancamentos_usuario_data  ON lancamentos (usuario_id, data);
CREATE INDEX idx_lancamentos_grupo         ON lancamentos (grupo_parcelamento);
CREATE INDEX idx_lancamentos_categoria     ON lancamentos (categoria_id);
CREATE INDEX idx_lancamentos_fonte_destino ON lancamentos (fonte_destino_id);

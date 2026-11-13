// src/config/db.js
// Pool de conexões com o PostgreSQL: reaproveita conexões em vez de abrir uma por requisição.
import pg from 'pg';
import 'dotenv/config';

const { Pool, types } = pg;

// NUMERIC chega como texto para não perder precisão; DATE fica como 'AAAA-MM-DD' (sem fuso horário).
types.setTypeParser(1082, (valor) => valor);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Consulta simples (sempre com parâmetros $1, $2... — nunca concatenar texto do usuário)
export function query(sql, parametros = []) {
  return pool.query(sql, parametros);
}

// Executa várias consultas numa transação: tudo é gravado ou nada é gravado.
// Uso: await transacao(async (cliente) => { await cliente.query(...); ... });
export async function transacao(funcao) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await funcao(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

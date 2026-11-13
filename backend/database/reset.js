// database/reset.js
// Cria o banco (se ainda não existir) e recria as tabelas a partir de 01-schema.sql.
// Uso: npm run db:reset
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import 'dotenv/config';

const url = new URL(process.env.DATABASE_URL);
const nomeBanco = url.pathname.slice(1);

// 1) Conecta no banco padrão "postgres" para criar o banco da aplicação
const urlAdmin = new URL(url);
urlAdmin.pathname = '/postgres';
const admin = new pg.Client({ connectionString: urlAdmin.toString() });
await admin.connect();
const existe = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [nomeBanco]);
if (existe.rowCount === 0) {
  await admin.query(`CREATE DATABASE "${nomeBanco.replace(/"/g, '')}"`);
  console.log(`Banco "${nomeBanco}" criado.`);
}
await admin.end();

// 2) Executa o schema no banco da aplicação
const cliente = new pg.Client({ connectionString: url.toString() });
await cliente.connect();
const schema = await readFile(new URL('./01-schema.sql', import.meta.url), 'utf8');
await cliente.query(schema);
await cliente.end();
console.log('Tabelas recriadas. Rode "npm run seed" para carregar os dados de demonstração.');

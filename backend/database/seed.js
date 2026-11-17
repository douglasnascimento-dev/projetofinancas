// database/seed.js
// Carga inicial para a demonstração: 2 usuários e 3 meses de lançamentos (set–nov/2026).
// Uso: npm run seed   (rode antes "npm run db:reset")
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { pool, transacao } from '../src/config/db.js';
import { dividirEmParcelas } from '../src/models/regras/parcelas.js';

const SENHA_DEMO = 'senha1234';

const CATEGORIAS = [
  ['Salário', 'entrada'], ['Freelance', 'entrada'], ['Rendimentos', 'entrada'],
  ['Alimentação', 'saida'], ['Moradia', 'saida'], ['Saúde', 'saida'], ['Mobilidade', 'saida'],
  ['Lazer', 'saida'], ['Educação', 'saida'], ['Outros', 'saida'],
];

async function criarUsuario(cliente, { nome, email, cpf }) {
  const senhaHash = await bcrypt.hash(SENHA_DEMO, 10);
  const { rows } = await cliente.query(
    'INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES ($1, $2, $3, $4) RETURNING id',
    [nome, email, cpf, senhaHash],
  );
  const usuarioId = rows[0].id;

  const cat = {};
  for (const [nomeCat, tipo] of CATEGORIAS) {
    const r = await cliente.query(
      'INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3) RETURNING id',
      [usuarioId, nomeCat, tipo],
    );
    cat[nomeCat] = r.rows[0].id;
  }
  return { usuarioId, cat };
}

async function criarFonte(cliente, usuarioId, nome, tipo, extra = {}) {
  const { rows } = await cliente.query(
    `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite, reserva)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [usuarioId, nome, tipo, extra.fechamento ?? null, extra.vencimento ?? null, extra.limite ?? null, extra.reserva ?? false],
  );
  return rows[0].id;
}

async function lancar(cliente, usuarioId, { tipo, descricao, valor, data, categoriaId, fonteId, parcelas = 1 }) {
  const grupo = parcelas > 1 ? randomUUID() : null;
  const valores = dividirEmParcelas(valor, parcelas);
  for (let i = 0; i < parcelas; i++) {
    await cliente.query(
      `INSERT INTO lancamentos
         (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id, parcela_atual, total_parcelas, grupo_parcelamento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [usuarioId, tipo, descricao, valores[i], data, categoriaId, fonteId, i + 1, parcelas, grupo],
    );
  }
}

await transacao(async (cliente) => {
  // ---------- Ana: usuária principal da demonstração
  const ana = await criarUsuario(cliente, { nome: 'Ana Souza', email: 'ana@email.com', cpf: '52998224725' });
  const a = ana.usuarioId, c = ana.cat;
  const empresa = await criarFonte(cliente, a, 'Empresa (salário)', 'renda');
  const conta = await criarFonte(cliente, a, 'Conta corrente', 'conta');
  const poupanca = await criarFonte(cliente, a, 'Poupança', 'conta', { reserva: true });
  const dinheiro = await criarFonte(cliente, a, 'Dinheiro', 'conta');
  const nubank = await criarFonte(cliente, a, 'Nubank', 'cartao_credito', { fechamento: 3, vencimento: 10, limite: 5000 });
  const visa = await criarFonte(cliente, a, 'Visa Crédito', 'cartao_credito', { fechamento: 25, vencimento: 5, limite: 3000 });

  for (const mes of ['09', '10', '11']) {
    const d = (dia) => `2026-${mes}-${dia}`;
    await lancar(cliente, a, { tipo: 'entrada', descricao: 'Salário', valor: 6450, data: d('05'), categoriaId: c['Salário'], fonteId: empresa });
    await lancar(cliente, a, { tipo: 'saida', descricao: 'Aluguel', valor: 1500, data: d('05'), categoriaId: c['Moradia'], fonteId: conta });
    await lancar(cliente, a, { tipo: 'saida', descricao: 'Academia', valor: 119.9, data: d('04'), categoriaId: c['Saúde'], fonteId: nubank });
    await lancar(cliente, a, { tipo: 'saida', descricao: 'Spotify', valor: 21.9, data: d('14'), categoriaId: c['Lazer'], fonteId: nubank });
    await lancar(cliente, a, { tipo: 'saida', descricao: 'Transferência para a poupança', valor: 500, data: d('06'), categoriaId: c['Outros'], fonteId: conta });
    await lancar(cliente, a, { tipo: 'entrada', descricao: 'Depósito na poupança', valor: 500, data: d('06'), categoriaId: c['Rendimentos'], fonteId: poupanca });
  }

  const avulsos = [
    ['saida', 'Mercado Pão de Açúcar', 412.35, '2026-09-08', 'Alimentação', conta],
    ['saida', 'iFood', 86.4, '2026-09-19', 'Alimentação', nubank],
    ['saida', 'Uber', 32.5, '2026-09-22', 'Mobilidade', visa],
    ['saida', 'Posto Shell', 250, '2026-09-12', 'Mobilidade', visa],
    ['saida', 'Cinema', 64, '2026-09-27', 'Lazer', dinheiro],
    ['entrada', 'Freelance — landing page', 800, '2026-10-07', 'Freelance', conta],
    ['saida', 'Mercado Extra', 498.15, '2026-10-09', 'Alimentação', nubank],
    ['saida', 'Farmácia São João', 48.9, '2026-10-20', 'Saúde', conta],
    ['saida', 'Uber', 27.8, '2026-10-10', 'Mobilidade', visa],
    ['saida', 'Restaurante', 47.72, '2026-10-24', 'Alimentação', dinheiro],
    ['saida', 'Mercado Pão de Açúcar', 212.37, '2026-11-13', 'Alimentação', conta],
    ['saida', 'Posto Shell', 250, '2026-11-10', 'Mobilidade', visa],
    ['saida', 'Uber', 27.8, '2026-11-03', 'Mobilidade', nubank],         // dia do fechamento → fatura seguinte
    ['saida', 'Farmácia São João', 48.9, '2026-11-02', 'Saúde', nubank],  // antes do fechamento → fatura de nov
    ['entrada', 'Rendimento da poupança', 42.15, '2026-11-01', 'Rendimentos', poupanca],
  ];
  for (const [tipo, descricao, valor, data, categoria, fonteId] of avulsos) {
    await lancar(cliente, a, { tipo, descricao, valor, data, categoriaId: c[categoria], fonteId });
  }

  // Compras parceladas (aparecem nas próximas faturas)
  await lancar(cliente, a, { tipo: 'saida', descricao: 'Notebook', valor: 3899, data: '2026-09-12', categoriaId: c['Educação'], fonteId: nubank, parcelas: 10 });
  await lancar(cliente, a, { tipo: 'saida', descricao: 'Passagem aérea', valor: 1195, data: '2026-10-08', categoriaId: c['Lazer'], fonteId: nubank, parcelas: 4 });
  await lancar(cliente, a, { tipo: 'saida', descricao: 'Fone Bluetooth', valor: 199, data: '2026-10-02', categoriaId: c['Lazer'], fonteId: visa, parcelas: 3 });
  await lancar(cliente, a, { tipo: 'saida', descricao: 'Curso de inglês', valor: 100, data: '2026-11-11', categoriaId: c['Educação'], fonteId: visa, parcelas: 3 });

  // ---------- Bruno: segundo usuário, usado para provar o isolamento (RF3)
  const bruno = await criarUsuario(cliente, { nome: 'Bruno Lima', email: 'bruno@email.com', cpf: '11144477735' });
  const b = bruno.usuarioId, cb = bruno.cat;
  const contaB = await criarFonte(cliente, b, 'Conta corrente', 'conta');
  const cartaoB = await criarFonte(cliente, b, 'Inter Black', 'cartao_credito', { fechamento: 15, vencimento: 22, limite: 4000 });
  for (const mes of ['09', '10', '11']) {
    await lancar(cliente, b, { tipo: 'entrada', descricao: 'Salário', valor: 4200, data: `2026-${mes}-05`, categoriaId: cb['Salário'], fonteId: contaB });
    await lancar(cliente, b, { tipo: 'saida', descricao: 'Aluguel', valor: 1200, data: `2026-${mes}-06`, categoriaId: cb['Moradia'], fonteId: contaB });
    await lancar(cliente, b, { tipo: 'saida', descricao: 'Supermercado', valor: 640.4, data: `2026-${mes}-12`, categoriaId: cb['Alimentação'], fonteId: cartaoB });
  }
  await lancar(cliente, b, { tipo: 'saida', descricao: 'Bicicleta', valor: 1800, data: '2026-10-20', categoriaId: cb['Mobilidade'], fonteId: cartaoB, parcelas: 6 });
});

await pool.end();
console.log(`Seed concluído. Logins: ana@email.com e bruno@email.com (senha: ${SENHA_DEMO}).`);

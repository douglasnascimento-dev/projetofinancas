// src/models/Usuario.js
// Acesso à tabela usuarios. Nunca devolve senha_hash para fora do model, exceto no login.
import { query, transacao } from '../config/db.js';

// Conjunto padrão criado no cadastro, para o usuário já começar a usar a aplicação
const CATEGORIAS_PADRAO = [
  ['Salário', 'entrada'], ['Freelance', 'entrada'], ['Rendimentos', 'entrada'],
  ['Alimentação', 'saida'], ['Moradia', 'saida'], ['Saúde', 'saida'], ['Mobilidade', 'saida'],
  ['Lazer', 'saida'], ['Educação', 'saida'], ['Outros', 'saida'],
];
const FONTES_PADRAO = [
  ['Salário', 'renda'],
  ['Conta corrente', 'conta'],
  ['Dinheiro', 'conta'],
];

class Usuario {

  // Cria o usuário e os dados padrão numa transação: ou grava tudo, ou nada.
  // Se e-mail ou CPF já existirem, o PostgreSQL lança 23505 (UNIQUE) — tratado na rota.
  async inserir({ nome, email, cpf, senhaHash }) {
    return transacao(async (cliente) => {
      const { rows } = await cliente.query(
        `INSERT INTO usuarios (nome, email, cpf, senha_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, nome, email, criado_em`,
        [nome, email, cpf, senhaHash],
      );
      const usuario = rows[0];

      for (const [nomeCategoria, tipo] of CATEGORIAS_PADRAO) {
        await cliente.query(
          'INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3)',
          [usuario.id, nomeCategoria, tipo],
        );
      }
      for (const [nomeFonte, tipo] of FONTES_PADRAO) {
        await cliente.query(
          'INSERT INTO fontes_destinos (usuario_id, nome, tipo) VALUES ($1, $2, $3)',
          [usuario.id, nomeFonte, tipo],
        );
      }
      return usuario;
    });
  }

  // Usado só no login: é o único método que lê senha_hash
  async buscarParaLogin(email) {
    const { rows } = await query(
      'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = $1',
      [email],
    );
    return rows[0] ?? null;
  }

  async buscarPorId(id) {
    const { rows } = await query(
      'SELECT id, nome, email, criado_em FROM usuarios WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  }

}

export default new Usuario();

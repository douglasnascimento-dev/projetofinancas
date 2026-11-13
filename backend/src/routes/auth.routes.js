// src/routes/auth.routes.js
// Cadastro, login e dados do usuário logado. Os controladores ficam no próprio arquivo de rotas.
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import { normalizarCpf } from '../models/regras/cpf.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';
import { validarCadastro, validarLogin, texto } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/autenticar.js';
import { limitarLogin } from '../middlewares/limitarLogin.js';
import { ErroApi } from '../middlewares/tratarErros.js';

const router = express.Router();

// Hash fixo usado quando o e-mail não existe, para o tempo de resposta não revelar isso
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-existe-123', 10);

// POST /api/auth/cadastro → 201, 400, 409
router.post('/cadastro', validarCadastro, async (req, res, next) => {
  const { nome, email, cpf, senha } = req.body;
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = await Usuario.inserir({
      nome: texto(nome),
      email: texto(email).toLowerCase(),   // normaliza antes de gravar
      cpf: normalizarCpf(cpf),             // só dígitos
      senhaHash,
    });
    return res.status(201).json({ id: usuario.id, nome: usuario.nome, email: usuario.email });
  } catch (erro) {
    if (erro.code === '23505') {           // unique_violation: a garantia vem do banco
      const campo = erro.constraint?.includes('cpf') ? 'cpf' : 'email';
      return next(new ErroApi(409, 'Usuário já cadastrado.', {
        [campo]: `Já existe um usuário com este ${campo === 'cpf' ? 'CPF' : 'e-mail'}.`,
      }));
    }
    return next(erro);
  }
});

// POST /api/auth/login → 200, 400, 401
router.post('/login', limitarLogin, validarLogin, async (req, res, next) => {
  try {
    const email = texto(req.body.email).toLowerCase();
    const usuario = await Usuario.buscarParaLogin(email);
    const senhaConfere = await bcrypt.compare(req.body.senha, usuario?.senha_hash ?? HASH_FALSO);

    if (!usuario || !senhaConfere) {
      // Mensagem genérica: não revela se o e-mail existe
      throw new ErroApi(401, 'E-mail ou senha inválidos.');
    }

    const token = jwt.sign({ sub: String(usuario.id) }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.status(200).json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    });
  } catch (erro) {
    return next(erro);
  }
});

// GET /api/auth/me → 200, 401
router.get('/me', autenticar, async (req, res, next) => {
  try {
    const usuario = await Usuario.buscarPorId(req.usuarioId);
    if (!usuario) throw new ErroApi(401, 'Usuário não encontrado.');
    return res.status(200).json(usuario);
  } catch (erro) {
    return next(erro);
  }
});

export default router;

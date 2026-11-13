// src/middlewares/autenticar.js
// Valida o token JWT e disponibiliza o id do usuário em req.usuarioId.
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';

export function autenticar(req, res, next) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Token não informado.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuarioId = Number(payload.sub);              // id do usuário dono do token
    return next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

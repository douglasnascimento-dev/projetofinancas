// src/middlewares/limitarLogin.js
// Rate limiting na rota de login: no máximo 10 tentativas a cada 15 minutos por IP.
import rateLimit from 'express-rate-limit';

export const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

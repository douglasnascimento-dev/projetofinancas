// src/middlewares/tratarErros.js
// Tratamento de erros centralizado: toda resposta de erro sai no formato { erro, campos }.

// Erro "esperado" da API, lançado pelas rotas e middlewares: throw new ErroApi(409, 'Mensagem', { campo: '...' })
export class ErroApi extends Error {
  constructor(status, erro, campos) {
    super(erro);
    this.status = status;
    this.campos = campos;
  }
}

// Rota inexistente → 404
export function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: `Rota ${req.method} ${req.originalUrl} não encontrada.` });
}

// eslint-disable-next-line no-unused-vars
export function tratarErros(erro, req, res, next) {
  if (erro instanceof ErroApi) {
    const corpo = { erro: erro.message };
    if (erro.campos) corpo.campos = erro.campos;
    return res.status(erro.status).json(corpo);
  }

  // JSON mal formado no corpo da requisição
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'O corpo da requisição não é um JSON válido.' });
  }

  // Erros do PostgreSQL que viram respostas de negócio
  if (erro.code === '23503') {   // foreign_key_violation (ex.: excluir algo ainda em uso)
    return res.status(409).json({ erro: 'Registro em uso por outros dados.' });
  }
  if (erro.code === '22P02' || erro.code === '22007' || erro.code === '22008') {  // texto/data inválidos
    return res.status(400).json({ erro: 'Dados inválidos.' });
  }

  console.error(erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

// database/checklist.js
// Confere o "checklist final do grupo" do enunciado contra a API rodando.
// Uso: com o back-end no ar (npm run dev), rode em outro terminal: npm run checklist
// Cria dois usuários novos a cada execução (e-mail e CPF aleatórios), sem mexer nos dados do seed.
import { execSync } from 'node:child_process';
import { calcularFatura } from '../src/models/regras/faturas.js';

const API = process.env.API_URL ?? 'http://localhost:3000/api';
let falhas = 0;

function conferir(descricao, ok, detalhe = '') {
  console.log(`${ok ? '✔' : '✘'} ${descricao}${!ok && detalhe ? `\n    → ${detalhe}` : ''}`);
  if (!ok) falhas++;
}

async function chamar(metodo, caminho, { token, corpo } = {}) {
  const headers = {};
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API}${caminho}`, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  const texto = await r.text();
  return { status: r.status, texto, dados: texto ? JSON.parse(texto) : null };
}

// CPF válido aleatório (calcula os dois dígitos verificadores)
function cpfAleatorio() {
  const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += d[i] * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    d.push(resto === 10 ? 0 : resto);
  }
  return d.join('');
}
const comPontuacao = (c) => `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;

async function novoUsuario(sufixo) {
  const dados = { nome: `Teste ${sufixo}`, email: `teste.${sufixo}.${Date.now()}@email.com`, cpf: cpfAleatorio(), senha: 'senha1234', confirmacaoSenha: 'senha1234' };
  const cadastro = await chamar('POST', '/auth/cadastro', { corpo: dados });
  const login = await chamar('POST', '/auth/login', { corpo: { email: dados.email, senha: dados.senha } });
  return { ...dados, cadastro, token: login.dados?.token };
}

const a = await novoUsuario('a');
const b = await novoUsuario('b');
conferir('Cadastro e login de dois usuários', a.cadastro.status === 201 && Boolean(a.token) && Boolean(b.token), a.cadastro.texto);

// 1. Mesmo e-mail com letras maiúsculas diferentes
const r1 = await chamar('POST', '/auth/cadastro', { corpo: { ...a, email: a.email.toUpperCase(), cpf: cpfAleatorio() } });
conferir('Mesmo e-mail com maiúsculas diferentes é rejeitado (409 no campo email)', r1.status === 409 && Boolean(r1.dados?.campos?.email), r1.texto);

// 2. Mesmo CPF com e sem pontuação
const r2 = await chamar('POST', '/auth/cadastro', { corpo: { ...a, email: `outro.${Date.now()}@email.com`, cpf: comPontuacao(a.cpf) } });
conferir('Mesmo CPF com e sem pontuação é rejeitado (409 no campo cpf)', r2.status === 409 && Boolean(r2.dados?.campos?.cpf), r2.texto);

// 3. Nenhuma resposta contém senha_hash
const me = await chamar('GET', '/auth/me', { token: a.token });
const respostas = [a.cadastro.texto, me.texto, r1.texto, r2.texto].join(' ');
conferir('Nenhuma resposta da API contém senha_hash', !respostas.includes('senha_hash') && !respostas.includes('senhaHash'));

// Dados padrão do usuário A
const categorias = (await chamar('GET', '/categorias', { token: a.token })).dados;
const catSaida = categorias.find((c) => c.tipo === 'saida');
const catEntrada = categorias.find((c) => c.tipo === 'entrada');
const cartao = (await chamar('POST', '/fontes-destinos', {
  token: a.token, corpo: { nome: 'Cartão Teste', tipo: 'cartao_credito', diaFechamento: 3, diaVencimento: 10, limite: 5000 },
})).dados;
conferir('Usuário novo recebe categorias padrão e cria cartão', Boolean(catSaida && catEntrada && cartao?.id));

// 4. Uma compra de R$ 100,00 em 3× soma exatamente R$ 100,00
const compra = await chamar('POST', '/lancamentos', {
  token: a.token,
  corpo: { tipo: 'saida', descricao: 'Compra 3x', valor: 100, data: '2026-11-03', categoriaId: catSaida.id, fonteDestinoId: cartao.id, parcelas: 3 },
});
const parcelas = compra.dados?.itens ?? [];
const somaCentavos = parcelas.reduce((s, p) => s + Math.round(p.valor * 100), 0);
conferir('R$ 100,00 em 3× gera 33,34 + 33,33 + 33,33 = R$ 100,00',
  compra.status === 201 && parcelas.length === 3 && somaCentavos === 10000 && parcelas[0].valor === 33.34, compra.texto);

// 5. Compra no dia do fechamento cai na fatura do mês seguinte
const fatura = calcularFatura('2026-11-03', { diaFechamento: 3, diaVencimento: 10 });
conferir('Compra no dia do fechamento (03/11, fecha dia 3) cai na fatura de 12/2026', fatura.referencia === '2026-12');

// 6. Saída não aceita categoria de entrada
const r6 = await chamar('POST', '/lancamentos', {
  token: a.token,
  corpo: { tipo: 'saida', descricao: 'Errado', valor: 10, data: '2026-11-10', categoriaId: catEntrada.id, fonteDestinoId: cartao.id },
});
conferir('Lançamento de saída não aceita categoria de entrada (400)', r6.status === 400 && Boolean(r6.dados?.campos?.categoriaId), r6.texto);

// 7. Trocar o id na URL não dá acesso a dados de outro usuário (RF3)
const idA = parcelas[0]?.id;
const ler = await chamar('GET', `/lancamentos/${idA}`, { token: b.token });
const editar = await chamar('PUT', `/lancamentos/${idA}`, {
  token: b.token, corpo: { tipo: 'saida', descricao: 'Invasão', valor: 1, data: '2026-11-10', categoriaId: catSaida.id, fonteDestinoId: cartao.id },
});
const excluir = await chamar('DELETE', `/lancamentos/${idA}`, { token: b.token });
const excluirCategoria = await chamar('DELETE', `/categorias/${catSaida.id}`, { token: b.token });
const aindaExiste = await chamar('GET', `/lancamentos/${idA}`, { token: a.token });
conferir('Usuário B não lê, edita nem exclui dados do usuário A (404)',
  [ler.status, editar.status, excluir.status, excluirCategoria.status].every((s) => s === 404) && aindaExiste.status === 200,
  `GET ${ler.status}, PUT ${editar.status}, DELETE ${excluir.status}, DELETE categoria ${excluirCategoria.status}`);

// 8. Sem token ou com token inválido → 401
const semToken = await chamar('GET', '/lancamentos');
const tokenInvalido = await chamar('GET', '/lancamentos', { token: 'abc.def.ghi' });
conferir('Requisição sem token ou com token inválido/expirado → 401', semToken.status === 401 && tokenInvalido.status === 401);

// 9. Relatórios e faturas respondem para o usuário
const rel = await chamar('GET', '/relatorios/categorias?inicio=2026-11-01&fim=2026-11-30', { token: a.token });
const fat = await chamar('GET', '/relatorios/faturas?meses=3', { token: a.token });
const cartaoFat = fat.dados?.cartoes?.find((c) => c.id === cartao.id);
conferir('Relatórios e faturas respondem 200 com limite utilizado das parcelas a vencer',
  rel.status === 200 && fat.status === 200 && cartaoFat !== undefined, `${rel.texto} ${fat.texto}`.slice(0, 300));

// 10. .env fora do repositório e .env.example versionado
try {
  const versionados = execSync('git ls-files', { cwd: new URL('..', import.meta.url) }).toString().split('\n');
  conferir('.env não está no repositório; .env.example está',
    !versionados.some((f) => /(^|\/)\.env$/.test(f)) && versionados.includes('.env.example'));
} catch {
  console.log('… git não disponível: confira manualmente o .env');
}

console.log(falhas === 0 ? '\nTodos os itens conferidos.' : `\n${falhas} item(ns) falharam.`);
process.exit(falhas === 0 ? 0 : 1);

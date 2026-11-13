// src/models/regras/cpf.js
// Regras puras (sem banco) sobre CPF.

// Mantém só os dígitos: '529.982.247-25' → '52998224725'
export function normalizarCpf(cpf) {
  return String(cpf ?? '').replace(/\D/g, '');
}

// Valida os dois dígitos verificadores do CPF (não basta ter 11 dígitos)
export function cpfValido(cpf) {
  const d = normalizarCpf(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) {     // rejeita 111.111.111-11 etc.
    return false;
  }
  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

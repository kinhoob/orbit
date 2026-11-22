export function emailError(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Informe um e-mail válido.';
  return null;
}

// Regras de senha do cadastro, pedidas pelo Marco em 21/11/2026:
// mínimo de 8 caracteres com letra maiúscula, número e símbolo.
// Valem só para CRIAR conta; o login mantém a regra antiga (8+ caracteres)
// para não bloquear contas já criadas com senhas mais simples.
export function passwordRequirements(password) {
  return [
    { key: 'length', label: '8 caracteres ou mais', met: password.length >= 8 },
    { key: 'upper', label: 'letra maiúscula', met: /[A-ZÀ-Þ]/.test(password) },
    { key: 'number', label: 'número', met: /\d/.test(password) },
    { key: 'symbol', label: 'símbolo', met: /[^A-Za-zÀ-ÿ0-9\s]/.test(password) },
  ];
}

export function passwordPolicyError(password) {
  const missing = passwordRequirements(password).filter(r => !r.met).map(r => r.label);
  if (!missing.length) return null;
  return `A senha precisa de: ${missing.join(', ')}.`;
}

// Força honesta: não basta misturar tipos de caracteres. Fraca enquanto a
// política mínima não fecha; média quando fecha; forte só com 12+ caracteres.
export function passwordStrength(password) {
  if (passwordPolicyError(password)) return { level: 'weak', label: 'fraca', filled: 1 };
  if (password.length >= 12) return { level: 'strong', label: 'forte', filled: 3 };
  return { level: 'medium', label: 'média', filled: 2 };
}

export function validateCredentials(email, password) {
  const invalidEmail = emailError(email);
  if (invalidEmail) return invalidEmail;
  if (password.length < 8) return 'Use uma senha com pelo menos 8 caracteres.';
  return null;
}

export function validateSignup(email, password) {
  const invalidEmail = emailError(email);
  if (invalidEmail) return invalidEmail;
  return passwordPolicyError(password);
}

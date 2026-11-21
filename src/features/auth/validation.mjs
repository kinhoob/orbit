export function emailError(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Informe um e-mail válido.';
  return null;
}

export function validateCredentials(email, password) {
  const invalidEmail = emailError(email);
  if (invalidEmail) return invalidEmail;
  if (password.length < 8) return 'Use uma senha com pelo menos 8 caracteres.';
  return null;
}

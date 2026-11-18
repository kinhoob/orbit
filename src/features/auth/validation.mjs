export function validateCredentials(email, password) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Informe um e-mail válido.';
  if (password.length < 8) return 'Use uma senha com pelo menos 8 caracteres.';
  return null;
}

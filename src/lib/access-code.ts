/**
 * Gera a senha de acesso da extensao LOVABLACK.
 * Formato curto e legivel para o cliente digitar sem erro (sem caracteres ambiguos).
 */
export function generateAccessPassword(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

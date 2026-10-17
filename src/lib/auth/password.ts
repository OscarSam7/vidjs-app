import * as bcrypt from "bcryptjs";

// Hash sintético constante para mitigación de timing attacks / enumeración de usuarios
const DUMMY_HASH = "$2a$10$e8k8P0zT3L4Qo2w1a5.ZbeI2b1P9M2a3B4c5D6e7F8g9H0i1J2K3L";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Ejecuta una comparación de contraseñas de tiempo constante cuando un usuario no existe en la base de datos,
 * garantizando que el tiempo de respuesta no revele si un email está registrado o no.
 */
export async function dummyVerifyPassword(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH);
}

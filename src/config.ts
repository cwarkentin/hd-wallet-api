import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000'),
  alchemyApiKey: requireEnv('ALCHEMY_API_KEY'),
  encryptionKey: requireEnv('ENCRYPTION_KEY'),
  databaseUrl: requireEnv('DATABASE_URL'),
};
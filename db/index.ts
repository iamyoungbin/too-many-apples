import { env } from 'cloudflare:workers';
export function getDb() {
  if (!env.DB) throw new Error('Database binding unavailable');
  return env.DB;
}

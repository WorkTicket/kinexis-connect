import { getCloudflareContext } from '@opennextjs/cloudflare';
export const env = async () => (await getCloudflareContext({ async: true })).env;
export const db = async () => (await env()).DB;

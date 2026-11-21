import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

initOpenNextCloudflareForDev(); // lets `npm run dev` use the local D1 database and .dev.vars

export default {
  // Keep Portal output tracing scoped to this app, not the repository root.
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
};

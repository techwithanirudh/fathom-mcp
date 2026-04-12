import type { Config } from 'drizzle-kit'

import { env } from './src/env'

export default {
  schema: './src/server/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  tablesFilter: ['fathom_mcp_*'],
} satisfies Config

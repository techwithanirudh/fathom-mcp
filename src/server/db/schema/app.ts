import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// Users identified via Fathom OAuth
export const users = pgTable(
  'fathom_mcp_users',
  {
    id: text('id').primaryKey(),
    workspaceName: text('workspace_name').notNull(),
    emailHint: text('email_hint'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex('fathom_mcp_users_email_hint_unique').on(t.emailHint)]
)

// Web sessions for app login (cookie-based)
export const sessions = pgTable(
  'fathom_mcp_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('fathom_mcp_sessions_token_hash_unique').on(t.tokenHash),
    index('fathom_mcp_sessions_user_id_idx').on(t.userId),
  ]
)

// Fathom OAuth tokens stored encrypted at rest
export const fathomConnections = pgTable(
  'fathom_mcp_fathom_connections',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }).notNull(),
    scope: text('scope'),
    inferredRecorderEmail: text('inferred_recorder_email'),
    inferredRecorderName: text('inferred_recorder_name'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('fathom_mcp_connections_user_id_unique').on(t.userId),
    index('fathom_mcp_connections_recorder_email_idx').on(
      t.inferredRecorderEmail
    ),
  ]
)

// OAuth 2.1 clients registered by MCP clients via dynamic registration
export const oauthClients = pgTable('fathom_mcp_oauth_clients', {
  id: text('id').primaryKey(), // client_id
  clientName: text('client_name'),
  clientUri: text('client_uri'),
  redirectUris: text('redirect_uris').notNull(), // JSON: string[]
  grantTypes: text('grant_types').notNull().default('["authorization_code"]'), // JSON: string[]
  tokenEndpointAuthMethod: text('token_endpoint_auth_method')
    .notNull()
    .default('none'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// OAuth 2.1 authorization codes (single-use, PKCE required)
export const oauthCodes = pgTable(
  'fathom_mcp_oauth_codes',
  {
    id: text('id').primaryKey(), // the authorization code itself
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    redirectUri: text('redirect_uri').notNull(),
    codeChallenge: text('code_challenge'),
    codeChallengeMethod: text('code_challenge_method'),
    scopes: text('scopes').notNull().default('["mcp"]'), // JSON: string[]
    usedAt: timestamp('used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('fathom_mcp_oauth_codes_client_id_idx').on(t.clientId),
    index('fathom_mcp_oauth_codes_user_id_idx').on(t.userId),
  ]
)

// MCP bearer tokens — created manually or issued via OAuth
export const mcpTokens = pgTable(
  'fathom_mcp_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clientId: text('client_id').references(() => oauthClients.id, {
      onDelete: 'cascade',
    }),
    label: text('label').notNull(),
    tokenHash: text('token_hash').notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('fathom_mcp_tokens_hash_unique').on(t.tokenHash),
    index('fathom_mcp_tokens_user_id_idx').on(t.userId),
  ]
)

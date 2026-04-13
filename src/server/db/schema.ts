import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const users = pgTable(
  'mcp_users',
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
  (t) => [uniqueIndex('mcp_users_email_hint_uidx').on(t.emailHint)]
)

export const sessions = pgTable(
  'mcp_sessions',
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
    uniqueIndex('mcp_sessions_token_hash_uidx').on(t.tokenHash),
    index('mcp_sessions_user_id_idx').on(t.userId),
  ]
)

export const fathomTokens = pgTable(
  'mcp_fathom_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessTokenEnc: text('access_token_enc').notNull(),
    refreshTokenEnc: text('refresh_token_enc').notNull(),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }).notNull(),
    recorderEmail: text('recorder_email'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex('mcp_fathom_tokens_user_id_uidx').on(t.userId)]
)

export const oauthClients = pgTable('mcp_oauth_clients', {
  id: text('id').primaryKey(),
  name: text('name'),
  uri: text('uri'),
  redirectUris: text('redirect_uris').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const oauthCodes = pgTable(
  'mcp_oauth_codes',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    redirectUri: text('redirect_uri').notNull(),
    codeChallenge: text('code_challenge').notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('mcp_oauth_codes_client_id_idx').on(t.clientId),
    index('mcp_oauth_codes_user_id_idx').on(t.userId),
  ]
)

export const mcpTokens = pgTable(
  'mcp_tokens',
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
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('mcp_tokens_hash_uidx').on(t.tokenHash),
    index('mcp_tokens_user_id_idx').on(t.userId),
  ]
)

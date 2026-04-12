import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

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
  (table) => [
    uniqueIndex('fathom_mcp_users_email_hint_unique').on(table.emailHint),
  ]
)

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
  (table) => [
    uniqueIndex('fathom_mcp_sessions_token_hash_unique').on(table.tokenHash),
    index('fathom_mcp_sessions_user_id_idx').on(table.userId),
  ]
)

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
  (table) => [
    uniqueIndex('fathom_mcp_connections_user_id_unique').on(table.userId),
    index('fathom_mcp_connections_inferred_recorder_email_idx').on(
      table.inferredRecorderEmail
    ),
  ]
)

export const mcpTokens = pgTable(
  'fathom_mcp_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    tokenHash: text('token_hash').notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('fathom_mcp_tokens_hash_unique').on(table.tokenHash),
    index('fathom_mcp_tokens_user_id_idx').on(table.userId),
  ]
)

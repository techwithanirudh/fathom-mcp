/**
 * Database schema — one file, all tables.
 *
 * Table prefix: mcp_
 *
 * users          — people who connected their Fathom account
 * sessions       — browser sessions for the management UI
 * fathom_tokens  — encrypted Fathom OAuth tokens (per user).
 * oauth_clients  — MCP clients registered via dynamic registration
 * oauth_codes    — short-lived authorization codes (OAuth consent flow)
 * mcp_tokens     — long-lived bearer tokens used by MCP clients
 */

import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = pgTable(
  'mcp_users',
  {
    id: text('id').primaryKey(),
    workspaceName: text('workspace_name').notNull(),
    // Email inferred from Fathom meetings — used to de-duplicate on reconnect.
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

// ---------------------------------------------------------------------------
// Sessions  (cookie-based, for the management UI)
// ---------------------------------------------------------------------------

export const sessions = pgTable(
  'mcp_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // We store a SHA-256 hash of the session token, never the raw value.
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

// ---------------------------------------------------------------------------
// Fathom OAuth tokens  (encrypted at rest with AES-256-GCM)
// ---------------------------------------------------------------------------

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
    // Recorder email/name inferred from the first Fathom meeting page.
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

// ---------------------------------------------------------------------------
// OAuth clients  (registered by MCP clients via /api/oauth/register)
// ---------------------------------------------------------------------------

export const oauthClients = pgTable('mcp_oauth_clients', {
  id: text('id').primaryKey(), // client_id
  name: text('name'), // human-readable name shown on the consent page
  uri: text('uri'), // homepage of the client application
  // JSON-encoded string[]:  ["https://app.example.com/callback"]
  redirectUris: text('redirect_uris').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// ---------------------------------------------------------------------------
// OAuth authorization codes  (single-use, 10-minute TTL, PKCE required)
// ---------------------------------------------------------------------------

export const oauthCodes = pgTable(
  'mcp_oauth_codes',
  {
    // The code itself is the primary key — random 32-byte base64url value.
    id: text('id').primaryKey(),
    clientId: text('client_id')
      .notNull()
      .references(() => oauthClients.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    redirectUri: text('redirect_uri').notNull(),
    // PKCE: code_challenge = BASE64URL(SHA256(code_verifier))
    codeChallenge: text('code_challenge').notNull(),
    // Timestamp set when the code is exchanged — prevents replay.
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

// ---------------------------------------------------------------------------
// MCP tokens  (bearer tokens presented to /mcp)
// ---------------------------------------------------------------------------

export const mcpTokens = pgTable(
  'mcp_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Set for tokens issued via OAuth; null for manually-created tokens.
    clientId: text('client_id').references(() => oauthClients.id, {
      onDelete: 'cascade',
    }),
    label: text('label').notNull(),
    // SHA-256 hex hash of the raw token — never store the raw value.
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

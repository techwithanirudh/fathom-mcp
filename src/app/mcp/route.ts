import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { z } from 'zod'

import { createFathomClient } from '@/server/fathom/client'
import { verifyMcpToken } from '@/server/mcp/tokens'

interface ToolExtra {
  authInfo?: AuthInfo
}

const listMeetingsInputSchema = {
  calendar_invitees: z
    .array(z.string().email())
    .optional()
    .describe('Filter by invitee email addresses.'),
  calendar_invitees_domains: z
    .array(z.string())
    .optional()
    .describe('Filter by invitee company domains.'),
  calendar_invitees_domains_type: z
    .enum(['only_internal', 'one_or_more_external'])
    .optional()
    .describe('Filter by internal or external invitees.'),
  created_after: z
    .string()
    .optional()
    .describe('Only include meetings created after this ISO timestamp.'),
  created_before: z
    .string()
    .optional()
    .describe('Only include meetings created before this ISO timestamp.'),
  cursor: z.string().optional().describe('Pagination cursor.'),
  include_action_items: z
    .boolean()
    .optional()
    .describe('Include action items in the response.'),
  include_crm_matches: z
    .boolean()
    .optional()
    .describe('Include CRM matches in the response.'),
  include_summary: z
    .boolean()
    .optional()
    .describe('Include summary content in the response.'),
  include_transcript: z
    .boolean()
    .optional()
    .describe('Include transcript content in the response.'),
  recorded_by: z
    .array(z.string().email())
    .optional()
    .describe('Filter by recorder email addresses.'),
  teams: z.array(z.string()).optional().describe('Filter by team name.'),
} as const

const getSummaryInputSchema = {
  destination_url: z
    .string()
    .url()
    .optional()
    .describe('Optional callback URL for async summary delivery.'),
  recording_id: z
    .number()
    .int()
    .positive()
    .describe('The Fathom recording ID.'),
} as const

const getTranscriptInputSchema = {
  destination_url: z
    .string()
    .url()
    .optional()
    .describe('Optional callback URL for async transcript delivery.'),
  recording_id: z
    .number()
    .int()
    .positive()
    .describe('The Fathom recording ID.'),
} as const

const listTeamMembersInputSchema = {
  cursor: z.string().optional().describe('Pagination cursor.'),
  team_names: z
    .array(z.string())
    .optional()
    .describe('Filter members by team name.'),
} as const

const listTeamsInputSchema = {
  cursor: z.string().optional().describe('Pagination cursor.'),
} as const

const createWebhookInputSchema = {
  destination_url: z.string().url(),
  include_action_items: z.boolean().optional(),
  include_crm_matches: z.boolean().optional(),
  include_summary: z.boolean().optional(),
  include_transcript: z.boolean().optional(),
  triggered_for: z
    .array(z.enum(['my_recordings', 'shared_external_recordings']))
    .optional(),
} as const

const deleteWebhookInputSchema = {
  webhook_id: z.string().min(1),
} as const

const FATHOM_API_INFO = `# Fathom MCP

Authenticated remote MCP server backed by Fathom OAuth.

Available tools:
- list_meetings
- get_summary
- get_transcript
- list_teams
- list_team_members
- create_webhook
- delete_webhook`

const FATHOM_RATE_LIMITS = `# Fathom API notes

Fathom applies upstream API rate limits. When those limits are hit, the MCP server surfaces the upstream error back to the client.`

const getUserId = (extra: ToolExtra) => {
  const userId = extra.authInfo?.extra?.userId

  if (typeof userId !== 'string' || userId.length === 0) {
    throw new Error('Authenticated MCP token is missing a user ID.')
  }

  return userId
}

const toTextResult = (value: unknown) => ({
  content: [
    {
      text: JSON.stringify(value, null, 2),
      type: 'text' as const,
    },
  ],
})

const getFirstPage = async <T>(iteratorPromise: Promise<AsyncIterable<T>>) => {
  const iterator = await iteratorPromise

  for await (const page of iterator) {
    return page ?? null
  }

  return null
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'list_meetings',
      {
        description:
          'List Fathom meetings recorded by or shared with the connected user.',
        inputSchema: listMeetingsInputSchema,
        title: 'List meetings',
      },
      async (args, extra: ToolExtra) => {
        const client = createFathomClient(getUserId(extra))
        const page = await getFirstPage(
          client.listMeetings({
            calendarInviteesDomains: args.calendar_invitees_domains,
            calendarInviteesDomainsType: args.calendar_invitees_domains_type,
            createdAfter: args.created_after,
            createdBefore: args.created_before,
            cursor: args.cursor,
            includeActionItems: args.include_action_items,
            includeCrmMatches: args.include_crm_matches,
            includeSummary: args.include_summary,
            includeTranscript: args.include_transcript,
            recordedBy: args.recorded_by,
            teams: args.teams,
          })
        )

        return toTextResult(page)
      }
    )

    server.registerTool(
      'get_summary',
      {
        description: 'Fetch the summary for a specific Fathom recording.',
        inputSchema: getSummaryInputSchema,
        title: 'Get summary',
      },
      async (args, extra: ToolExtra) => {
        const client = createFathomClient(getUserId(extra))
        const response = await client.getRecordingSummary({
          destinationUrl: args.destination_url,
          recordingId: args.recording_id,
        })

        return toTextResult(response)
      }
    )

    server.registerTool(
      'get_transcript',
      {
        description: 'Fetch the transcript for a specific Fathom recording.',
        inputSchema: getTranscriptInputSchema,
        title: 'Get transcript',
      },
      async (args, extra: ToolExtra) => {
        const client = createFathomClient(getUserId(extra))
        const response = await client.getRecordingTranscript({
          destinationUrl: args.destination_url,
          recordingId: args.recording_id,
        })

        return toTextResult(response)
      }
    )

    server.registerTool(
      'list_teams',
      {
        description: 'List teams visible to the connected Fathom account.',
        inputSchema: listTeamsInputSchema,
        title: 'List teams',
      },
      async (args, extra: ToolExtra) => {
        const client = createFathomClient(getUserId(extra))
        const page = await getFirstPage(
          client.listTeams({
            cursor: args.cursor,
          })
        )

        return toTextResult(page)
      }
    )

    server.registerTool(
      'list_team_members',
      {
        description: 'List Fathom team members for the connected account.',
        inputSchema: listTeamMembersInputSchema,
        title: 'List team members',
      },
      async (args, extra: ToolExtra) => {
        const client = createFathomClient(getUserId(extra))
        const page = await getFirstPage(
          client.listTeamMembers({
            cursor: args.cursor,
            team: args.team_names?.[0],
          })
        )

        return toTextResult(page)
      }
    )

    server.registerTool(
      'create_webhook',
      {
        description: 'Create a webhook for Fathom recording events.',
        inputSchema: createWebhookInputSchema,
        title: 'Create webhook',
      },
      async (args, extra: ToolExtra) => {
        const client = createFathomClient(getUserId(extra))
        const webhook = await client.createWebhook({
          destinationUrl: args.destination_url,
          includeActionItems: args.include_action_items,
          includeCrmMatches: args.include_crm_matches,
          includeSummary: args.include_summary,
          includeTranscript: args.include_transcript,
          triggeredFor: args.triggered_for ?? ['my_recordings'],
        })

        return toTextResult(webhook)
      }
    )

    server.registerTool(
      'delete_webhook',
      {
        description: 'Delete a webhook by ID.',
        inputSchema: deleteWebhookInputSchema,
        title: 'Delete webhook',
      },
      async (args, extra: ToolExtra) => {
        const client = createFathomClient(getUserId(extra))
        await client.deleteWebhook({
          id: args.webhook_id,
        })

        return toTextResult({ success: true, webhookId: args.webhook_id })
      }
    )

    server.registerResource(
      'fathom-api-info',
      'fathom://api/info',
      {
        description: 'Overview of this Fathom MCP server.',
        mimeType: 'text/markdown',
        title: 'Fathom API info',
      },
      async () => ({
        contents: [{ text: FATHOM_API_INFO, uri: 'fathom://api/info' }],
      })
    )

    server.registerResource(
      'fathom-rate-limits',
      'fathom://api/rate-limits',
      {
        description: 'Notes about upstream Fathom API rate limiting.',
        mimeType: 'text/markdown',
        title: 'Fathom rate limits',
      },
      async () => ({
        contents: [
          { text: FATHOM_RATE_LIMITS, uri: 'fathom://api/rate-limits' },
        ],
      })
    )
  },
  {
    serverInfo: {
      name: 'fathom-mcp',
      version: '0.2.0',
    },
  },
  {
    basePath: '',
    disableSse: true,
    maxDuration: 60,
    verboseLogs: true,
  }
)

const authedHandler = withMcpAuth(
  async (request: Request) => handler(request),
  async (_request: Request, bearerToken?: string) =>
    verifyMcpToken(bearerToken),
  {
    required: true,
    requiredScopes: ['mcp'],
    resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp',
  }
)

export const GET = authedHandler
export const POST = authedHandler
export const DELETE = authedHandler

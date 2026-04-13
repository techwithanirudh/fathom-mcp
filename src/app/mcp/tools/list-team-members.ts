import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { createFathomClient } from '@/server/fathom'
import type { TeamMemberListResult } from '@/types/fathom'
import { teamMemberListOutputSchema } from '../schemas'
import { err } from '../utils'

export function listTeamMembersTool(server: McpServer) {
  server.registerTool(
    'list_team_members',
    {
      title: 'Fathom: List Team Members',
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        readOnlyHint: true,
      },
      description:
        'List members of a Fathom team. Optionally filter by team name.',
      inputSchema: {
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor from a previous response.'),
        team: z.string().optional().describe('Team name to filter by.'),
      },
      outputSchema: teamMemberListOutputSchema,
    },
    async ({ cursor, team }, { authInfo }) => {
      const userId = authInfo?.extra?.userId as string | undefined
      if (!userId) {
        return err('Unauthorized.')
      }

      try {
        const client = createFathomClient(userId)
        const iter = await client.listTeamMembers({ cursor, team })

        let members: TeamMemberListResult['members'] = []
        let nextCursor: string | null = null

        for await (const page of iter) {
          if (!page) {
            break
          }
          members = page.result.items.map((m) => ({
            createdAt: m.createdAt.toISOString(),
            email: m.email,
            name: m.name,
          }))
          nextCursor = page.result.nextCursor
          break
        }

        const result: TeamMemberListResult = { members, nextCursor }
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>,
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await server.server.sendLoggingMessage({
          level: 'error',
          data: `list_team_members: ${msg}`,
        })
        return err(`Failed to list team members: ${msg}`)
      }
    }
  )
}

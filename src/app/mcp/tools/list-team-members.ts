import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { createFathomClient } from '@/server/fathom'
import type { TeamMemberListResult } from '@/types/fathom'

export function registerListTeamMembers(server: McpServer) {
  server.registerTool(
    'list_team_members',
    {
      title: 'Fathom: List Team Members',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
      description:
        'List members of a Fathom team. Optionally filter by team name.',
      inputSchema: {
        team: z.string().optional().describe('Team name to filter by.'),
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor from a previous response.'),
      },
    },
    async ({ team, cursor }, { authInfo }) => {
      const userId = authInfo?.extra?.userId as string | undefined

      if (!userId) {
        return { content: [{ type: 'text', text: 'Unauthorized.' }] }
      }

      const client = createFathomClient(userId)
      const iter = await client.listTeamMembers({ team, cursor })

      let members: TeamMemberListResult['members'] = []
      let nextCursor: string | null = null

      for await (const page of iter) {
        if (!page) {
          break
        }

        members = page.result.items.map((m) => ({
          name: m.name,
          email: m.email,
          createdAt: m.createdAt,
        }))
        nextCursor = page.result.nextCursor
        break
      }

      const result: TeamMemberListResult = { members, nextCursor }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    }
  )
}

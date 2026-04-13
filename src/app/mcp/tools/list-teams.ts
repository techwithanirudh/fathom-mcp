import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { createFathomClient } from '@/server/fathom'
import type { TeamListResult } from '@/types/fathom'

export function registerListTeams(server: McpServer) {
  server.registerTool(
    'list_teams',
    {
      title: 'Fathom: List Teams',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
      description: 'List all teams in your Fathom workspace.',
      inputSchema: {
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor from a previous response.'),
      },
    },
    async ({ cursor }, { authInfo }) => {
      const userId = authInfo?.extra?.userId as string | undefined

      if (!userId) {
        return { content: [{ type: 'text', text: 'Unauthorized.' }] }
      }

      const client = createFathomClient(userId)
      const iter = await client.listTeams({ cursor })

      let teams: TeamListResult['teams'] = []
      let nextCursor: string | null = null

      for await (const page of iter) {
        if (!page) {
          break
        }

        teams = page.result.items.map((t) => ({
          name: t.name,
          createdAt: t.createdAt,
        }))
        nextCursor = page.result.nextCursor
        break
      }

      const result: TeamListResult = { teams, nextCursor }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    }
  )
}

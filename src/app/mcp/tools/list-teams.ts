import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { createFathomClient } from '@/server/fathom'
import type { TeamListResult } from '@/types/fathom'
import { teamListOutputSchema } from '../schemas'

const err = (text: string) => ({
  isError: true as const,
  content: [{ type: 'text' as const, text }],
})

export function registerListTeams(server: McpServer) {
  server.registerTool(
    'list_teams',
    {
      title: 'Fathom: List Teams',
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        readOnlyHint: true,
      },
      description: 'List all teams in your Fathom workspace.',
      inputSchema: {
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor from a previous response.'),
      },
      outputSchema: teamListOutputSchema,
    },
    async ({ cursor }, { authInfo }) => {
      const userId = authInfo?.extra?.userId as string | undefined
      if (!userId) {
        return err('Unauthorized.')
      }

      try {
        const client = createFathomClient(userId)
        const iter = await client.listTeams({ cursor })

        let teams: TeamListResult['teams'] = []
        let nextCursor: string | null = null

        for await (const page of iter) {
          if (!page) {
            break
          }
          teams = page.result.items.map((t) => ({
            createdAt: t.createdAt,
            name: t.name,
          }))
          nextCursor = page.result.nextCursor
          break
        }

        const result: TeamListResult = { nextCursor, teams }
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>,
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await server.server.sendLoggingMessage({
          level: 'error',
          data: `list_teams: ${msg}`,
        })
        return err(`Failed to list teams: ${msg}`)
      }
    }
  )
}

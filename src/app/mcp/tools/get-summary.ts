import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { createFathomClient } from '@/server/fathom'
import type { SummaryResult } from '@/types/fathom'
import { summaryOutputSchema } from '../schemas'

const err = (text: string) => ({
  isError: true as const,
  content: [{ type: 'text' as const, text }],
})

export function registerGetSummary(server: McpServer) {
  server.registerTool(
    'get_summary',
    {
      title: 'Fathom: Get Summary',
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        readOnlyHint: true,
      },
      description: 'Get the AI-generated summary of a Fathom meeting.',
      inputSchema: {
        recording_id: z
          .number()
          .int()
          .describe('The recording ID from list_meetings.'),
      },
      outputSchema: summaryOutputSchema,
    },
    async ({ recording_id }, { authInfo }) => {
      const userId = authInfo?.extra?.userId as string | undefined
      if (!userId) {
        return err('Unauthorized.')
      }

      try {
        const client = createFathomClient(userId)
        const raw = await client.getRecordingSummary({
          recordingId: recording_id,
        })

        if (!(raw && 'summary' in raw)) {
          return err(`Summary not found for recording ${recording_id}.`)
        }

        const result: SummaryResult = {
          summary: raw.summary
            ? {
                markdownFormatted: raw.summary.markdownFormatted,
                templateName: raw.summary.templateName,
              }
            : null,
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>,
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await server.server.sendLoggingMessage({
          level: 'error',
          data: `get_summary: ${msg}`,
        })
        return err(`Failed to get summary: ${msg}`)
      }
    }
  )
}

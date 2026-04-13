import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { createFathomClient } from '@/server/fathom'
import type { SummaryResult } from '@/types/fathom'

export function registerGetSummary(server: McpServer) {
  server.registerTool(
    'get_summary',
    {
      title: 'Fathom: Get Summary',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
      description: 'Get the AI-generated summary of a Fathom meeting.',
      inputSchema: {
        recording_id: z
          .number()
          .int()
          .describe('The recording ID from list_meetings.'),
      },
    },
    async ({ recording_id }, { authInfo }) => {
      const userId = authInfo?.extra?.userId as string | undefined

      if (!userId) {
        return { content: [{ type: 'text', text: 'Unauthorized.' }] }
      }

      const client = createFathomClient(userId)
      const raw = await client.getRecordingSummary({
        recordingId: recording_id,
      })

      if (!(raw && 'summary' in raw)) {
        return { content: [{ type: 'text', text: 'Summary not found.' }] }
      }

      const result: SummaryResult = {
        summary: raw.summary
          ? {
              templateName: raw.summary.templateName,
              markdownFormatted: raw.summary.markdownFormatted,
            }
          : null,
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    }
  )
}

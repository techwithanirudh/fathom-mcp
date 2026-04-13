import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { fetchTranscript } from '@/server/fathom'
import type { TranscriptResult } from '@/types/fathom'
import { transcriptOutputSchema } from '../schemas'
import { err } from '../utils'

export function getTranscriptTool(server: McpServer) {
  server.registerTool(
    'get_transcript',
    {
      title: 'Fathom: Get Transcript',
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        readOnlyHint: true,
      },
      description:
        'Get the full transcript of a Fathom meeting by recording ID. Use this whenever the user asks for a transcript, action items, or anything requiring the spoken content of a meeting.',
      inputSchema: {
        recording_id: z
          .number()
          .int()
          .describe('The recording ID from list_meetings.'),
      },
      outputSchema: transcriptOutputSchema,
    },
    async ({ recording_id }, { authInfo }) => {
      const userId = authInfo?.extra?.userId as string | undefined
      if (!userId) {
        return err('Unauthorized.')
      }

      try {
        const transcript = await fetchTranscript(userId, recording_id)
        const result: TranscriptResult = { transcript }
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>,
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await server.server.sendLoggingMessage({
          level: 'error',
          data: `get_transcript: ${msg}`,
        })
        return err(`Failed to get transcript: ${msg}`)
      }
    }
  )
}

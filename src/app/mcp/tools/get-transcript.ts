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
        format: z
          .enum(['text', 'json'])
          .optional()
          .default('text')
          .describe(
            'Output format. "text" (default) returns a readable Speaker (HH:MM:SS): line format. "json" returns the raw structured array.'
          ),
        include_timestamps: z
          .boolean()
          .optional()
          .default(true)
          .describe('Include timestamps in text format. Default true.'),
      },
      outputSchema: transcriptOutputSchema,
    },
    async ({ recording_id, format, include_timestamps }, { authInfo }) => {
      const userId = authInfo?.extra?.userId as string | undefined
      if (!userId) {
        return err('Unauthorized.')
      }

      try {
        const transcript = await fetchTranscript(userId, recording_id)
        const result: TranscriptResult = { transcript }

        const text =
          format === 'json'
            ? JSON.stringify(result, null, 2)
            : transcript
                .map((t) =>
                  include_timestamps
                    ? `${t.speaker.displayName} (${t.timestamp}): ${t.text}`
                    : `${t.speaker.displayName}: ${t.text}`
                )
                .join('\n')

        return {
          content: [{ type: 'text', text }],
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

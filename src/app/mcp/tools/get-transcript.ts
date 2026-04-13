import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { getRecordingTranscript } from '@/server/fathom'
import type { TranscriptResult } from '@/types/fathom'
import { transcriptOutputSchema } from '../schemas'
import { err } from '../utils'

export function registerGetTranscript(server: McpServer) {
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
        'Get the full transcript of a Fathom meeting by recording ID.',
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
        const raw = await getRecordingTranscript(userId, recording_id)

        if (!raw?.transcript) {
          return err(`Recording ${recording_id} not found.`)
        }

        const result: TranscriptResult = {
          transcript: raw.transcript.map((t) => ({
            speaker: {
              displayName: t.speaker.displayName,
              matchedCalendarInviteeEmail:
                t.speaker.matchedCalendarInviteeEmail,
            },
            text: t.text,
            timestamp: t.timestamp,
          })),
        }
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

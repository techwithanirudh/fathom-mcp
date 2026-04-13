import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { createFathomClient } from '@/server/fathom'
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
        'Get the full transcript of a Fathom meeting. Pages through recordings until the requested recording ID is found.',
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
        const client = createFathomClient(userId)
        const iter = await client.listMeetings({ includeTranscript: true })

        for await (const page of iter) {
          if (!page) {
            break
          }

          const match = page.result.items.find(
            (m) => m.recordingId === recording_id
          )
          if (match) {
            const result: TranscriptResult = {
              transcript: (match.transcript ?? []).map((t) => ({
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
              content: [
                { type: 'text', text: JSON.stringify(result, null, 2) },
              ],
              structuredContent: result as unknown as Record<string, unknown>,
            }
          }

          if (!page.result.nextCursor) {
            break
          }
        }

        return err(`Recording ${recording_id} not found.`)
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

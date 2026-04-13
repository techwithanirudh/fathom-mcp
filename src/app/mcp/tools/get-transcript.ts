import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { getFathomBearerToken } from '@/server/fathom'
import type { TranscriptResult } from '@/types/fathom'
import { transcriptOutputSchema } from '../schemas'
import { err } from '../utils'

const FATHOM_API = 'https://api.fathom.ai/external/v1'

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
        const token = await getFathomBearerToken(userId)
        const res = await fetch(
          `${FATHOM_API}/recordings/${recording_id}/transcript`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (!res.ok) {
          const text = await res.text()
          return err(
            `Fathom API error ${res.status}: ${text || res.statusText}`
          )
        }

        const json = (await res.json()) as { transcript?: unknown }

        if (!Array.isArray(json.transcript)) {
          return err(`No transcript available for recording ${recording_id}.`)
        }

        const result: TranscriptResult = {
          transcript: json.transcript.map(
            (t: {
              speaker: {
                display_name: string
                matched_calendar_invitee_email?: string | null
              }
              text: string
              timestamp: string
            }) => ({
              speaker: {
                displayName: t.speaker.display_name,
                matchedCalendarInviteeEmail:
                  t.speaker.matched_calendar_invitee_email,
              },
              text: t.text,
              timestamp: t.timestamp,
            })
          ),
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

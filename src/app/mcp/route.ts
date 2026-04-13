import type { GetRecordingTranscriptRequest } from 'fathom-typescript/sdk/models/operations'
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { z } from 'zod'

import { env } from '@/env'
import { createFathomClient } from '@/server/fathom'
import { verifyToken } from '@/server/tokens'

const mcpHandler = createMcpHandler(
  (server) => {
    server.tool(
      'list_meetings',
      'List your Fathom meeting recordings. Returns meeting metadata and a cursor for pagination.',
      {
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor from a previous response.'),
      },
      async ({ cursor }, { authInfo }) => {
        const userId = authInfo?.extra?.userId as string | undefined

        if (!userId) {
          return { content: [{ type: 'text', text: 'Unauthorized.' }] }
        }

        const client = createFathomClient(userId)
        const iter = await client.listMeetings({ cursor })

        let meetings: {
          id: number
          title: string
          meetingTitle: string | null
          scheduledStart: Date
          scheduledEnd: Date
          url: string
          shareUrl: string
          recordedBy: string
        }[] = []
        let nextCursor: string | null = null

        for await (const page of iter) {
          if (!page) {
            break
          }

          meetings = page.result.items.map((m) => ({
            id: m.recordingId,
            title: m.title,
            meetingTitle: m.meetingTitle,
            scheduledStart: m.scheduledStartTime,
            scheduledEnd: m.scheduledEndTime,
            url: m.url,
            shareUrl: m.shareUrl,
            recordedBy: m.recordedBy.name,
          }))
          nextCursor = page.result.nextCursor
          break
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ meetings, nextCursor }, null, 2),
            },
          ],
        }
      }
    )

    server.tool(
      'get_transcript',
      'Get the full transcript of a Fathom meeting.',
      {
        recording_id: z
          .number()
          .int()
          .describe('The recording ID from list_meetings.'),
      },
      async ({ recording_id }, { authInfo }) => {
        const userId = authInfo?.extra?.userId as string | undefined

        if (!userId) {
          return { content: [{ type: 'text', text: 'Unauthorized.' }] }
        }

        const client = createFathomClient(userId)
        // destinationUrl is marked required in SDK types but optional in the API —
        // omitting it makes the endpoint return data synchronously.
        const req = {
          recordingId: recording_id,
        } as GetRecordingTranscriptRequest
        const res = await client.getRecordingTranscript(req)

        if (!res) {
          return {
            content: [{ type: 'text', text: 'Transcript not found.' }],
          }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        }
      }
    )

    server.tool(
      'get_summary',
      'Get the AI-generated summary of a Fathom meeting.',
      {
        recording_id: z
          .number()
          .int()
          .describe('The recording ID from list_meetings.'),
      },
      async ({ recording_id }, { authInfo }) => {
        const userId = authInfo?.extra?.userId as string | undefined

        if (!userId) {
          return { content: [{ type: 'text', text: 'Unauthorized.' }] }
        }

        const client = createFathomClient(userId)
        const res = await client.getRecordingSummary({
          recordingId: recording_id,
        })

        if (!res) {
          return { content: [{ type: 'text', text: 'Summary not found.' }] }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
        }
      }
    )
  },
  {
    serverInfo: { name: 'fathom-mcp', version: '1.0.0' },
  }
)

const handler = withMcpAuth(
  mcpHandler,
  (_req, bearerToken) => {
    if (!bearerToken) {
      return undefined
    }

    return verifyToken(bearerToken)
  },
  {
    required: true,
    resourceUrl: `${env.NEXT_PUBLIC_BASE_URL}/mcp`,
  }
)

export { handler as GET, handler as POST, handler as DELETE }

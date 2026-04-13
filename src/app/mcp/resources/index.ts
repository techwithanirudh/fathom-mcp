import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'

import { createFathomClient } from '@/server/fathom'

export function registerResources(server: McpServer) {
  server.registerResource(
    'meeting-transcript',
    new ResourceTemplate('fathom://meeting/{recordingId}/transcript', {
      list: async (extra) => {
        const userId = extra.authInfo?.extra?.userId as string | undefined
        if (!userId) {
          return { resources: [] }
        }

        const client = createFathomClient(userId)
        const iter = await client.listMeetings()
        const resources: {
          uri: string
          name: string
          description: string
          mimeType: string
        }[] = []

        for await (const page of iter) {
          if (!page) {
            break
          }

          for (const m of page.result.items) {
            resources.push({
              uri: `fathom://meeting/${m.recordingId}/transcript`,
              name: `Transcript: ${m.meetingTitle ?? m.title}`,
              description: `Recorded ${m.recordingStartTime.toISOString()}`,
              mimeType: 'application/json',
            })
          }

          break
        }

        return { resources }
      },
    }),
    {
      title: 'Fathom Meeting Transcript',
      description: 'Full speaker-labelled transcript of a Fathom meeting.',
      mimeType: 'application/json',
    },
    async (uri, variables, extra) => {
      const userId = extra.authInfo?.extra?.userId as string | undefined
      if (!userId) {
        throw new Error('Unauthorized')
      }

      const recordingId = Number(variables.recordingId)
      const client = createFathomClient(userId)
      const iter = await client.listMeetings({ includeTranscript: true })

      for await (const page of iter) {
        if (!page) {
          break
        }

        const match = page.result.items.find(
          (m) => m.recordingId === recordingId
        )
        if (match) {
          const transcript = (match.transcript ?? []).map((t) => ({
            speaker: {
              displayName: t.speaker.displayName,
              matchedCalendarInviteeEmail:
                t.speaker.matchedCalendarInviteeEmail,
            },
            text: t.text,
            timestamp: t.timestamp,
          }))

          return {
            contents: [
              {
                uri: uri.toString(),
                mimeType: 'application/json',
                text: JSON.stringify({ transcript }, null, 2),
              },
            ],
          }
        }

        if (!page.result.nextCursor) {
          break
        }
      }

      throw new Error(`Recording ${recordingId} not found`)
    }
  )

  server.registerResource(
    'meeting-summary',
    new ResourceTemplate('fathom://meeting/{recordingId}/summary', {
      list: async (extra) => {
        const userId = extra.authInfo?.extra?.userId as string | undefined
        if (!userId) {
          return { resources: [] }
        }

        const client = createFathomClient(userId)
        const iter = await client.listMeetings()
        const resources: {
          uri: string
          name: string
          description: string
          mimeType: string
        }[] = []

        for await (const page of iter) {
          if (!page) {
            break
          }

          for (const m of page.result.items) {
            resources.push({
              uri: `fathom://meeting/${m.recordingId}/summary`,
              name: `Summary: ${m.meetingTitle ?? m.title}`,
              description: `Recorded ${m.recordingStartTime.toISOString()}`,
              mimeType: 'application/json',
            })
          }

          break
        }

        return { resources }
      },
    }),
    {
      title: 'Fathom Meeting Summary',
      description: 'AI-generated summary of a Fathom meeting.',
      mimeType: 'application/json',
    },
    async (uri, variables, extra) => {
      const userId = extra.authInfo?.extra?.userId as string | undefined
      if (!userId) {
        throw new Error('Unauthorized')
      }

      const recordingId = Number(variables.recordingId)
      const client = createFathomClient(userId)
      const raw = await client.getRecordingSummary({ recordingId })

      if (!(raw && 'summary' in raw)) {
        throw new Error(`Summary not found for recording ${recordingId}`)
      }

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                summary: raw.summary
                  ? {
                      markdownFormatted: raw.summary.markdownFormatted,
                      templateName: raw.summary.templateName,
                    }
                  : null,
              },
              null,
              2
            ),
          },
        ],
      }
    }
  )
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'

import { createFathomClient, getRecordingTranscript } from '@/server/fathom'

export function registerMeetingTranscript(server: McpServer) {
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
      const raw = await getRecordingTranscript(userId, recordingId)

      if (raw?.transcript) {
        const transcript = raw.transcript.map((t) => ({
          speaker: {
            displayName: t.speaker.displayName,
            matchedCalendarInviteeEmail: t.speaker.matchedCalendarInviteeEmail,
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

      throw new Error(`Recording ${recordingId} not found`)
    }
  )
}

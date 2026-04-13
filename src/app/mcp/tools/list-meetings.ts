import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { createFathomClient } from '@/server/fathom'
import type { MeetingListItem, MeetingListResult } from '@/types/fathom'

export function registerListMeetings(server: McpServer) {
  server.registerTool(
    'list_meetings',
    {
      title: 'Fathom: List Meetings',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
      description:
        'List your Fathom meeting recordings. Returns meeting metadata and a cursor for pagination. Optionally include transcripts, summaries, and action items.',
      inputSchema: {
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor from a previous response.'),
        include_transcript: z
          .boolean()
          .optional()
          .describe('Include full transcript for each meeting.'),
        include_summary: z
          .boolean()
          .optional()
          .describe('Include AI-generated summary for each meeting.'),
        include_action_items: z
          .boolean()
          .optional()
          .describe('Include action items for each meeting.'),
      },
    },
    async (
      { cursor, include_transcript, include_summary, include_action_items },
      { authInfo }
    ) => {
      const userId = authInfo?.extra?.userId as string | undefined

      if (!userId) {
        return { content: [{ type: 'text', text: 'Unauthorized.' }] }
      }

      const client = createFathomClient(userId)
      const iter = await client.listMeetings({
        cursor,
        includeTranscript: include_transcript,
        includeSummary: include_summary,
        includeActionItems: include_action_items,
      })

      let meetings: MeetingListItem[] = []
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
          recordingStart: m.recordingStartTime,
          recordingEnd: m.recordingEndTime,
          url: m.url,
          shareUrl: m.shareUrl,
          recordedBy: m.recordedBy.name,
          invitees: m.calendarInvitees.map((i) => ({
            name: i.name,
            email: i.email,
            emailDomain: i.emailDomain,
            isExternal: i.isExternal,
          })),
          transcript:
            m.transcript?.map((t) => ({
              speaker: {
                displayName: t.speaker.displayName,
                matchedCalendarInviteeEmail:
                  t.speaker.matchedCalendarInviteeEmail,
              },
              text: t.text,
              timestamp: t.timestamp,
            })) ?? undefined,
          summary: m.defaultSummary
            ? {
                templateName: m.defaultSummary.templateName,
                markdownFormatted: m.defaultSummary.markdownFormatted,
              }
            : undefined,
          actionItems:
            m.actionItems?.map((a) => ({
              description: a.description,
              userGenerated: a.userGenerated,
              completed: a.completed,
              recordingTimestamp: a.recordingTimestamp,
              recordingPlaybackUrl: a.recordingPlaybackUrl,
              assignee: {
                name: a.assignee.name,
                email: a.assignee.email,
                team: a.assignee.team,
              },
            })) ?? undefined,
        }))
        nextCursor = page.result.nextCursor
        break
      }

      const result: MeetingListResult = { meetings, nextCursor }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    }
  )
}

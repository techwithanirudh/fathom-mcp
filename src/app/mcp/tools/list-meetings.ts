import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { createFathomClient } from '@/server/fathom'
import type { MeetingListItem, MeetingListResult } from '@/types/fathom'
import { meetingListOutputSchema } from '../schemas'
import { err } from '../utils'

export function listMeetingsTool(server: McpServer) {
  server.registerTool(
    'list_meetings',
    {
      title: 'Fathom: List Meetings',
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        readOnlyHint: true,
      },
      description:
        'List your Fathom meeting recordings. Returns meeting metadata and a cursor for pagination.',
      inputSchema: {
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor from a previous response.'),
        include_action_items: z
          .boolean()
          .optional()
          .describe(
            'Include AI-generated action items per meeting. May be empty, if so ALWAYS extract tasks from the transcript instead.'
          ),
      },
      outputSchema: meetingListOutputSchema,
    },
    async ({ cursor, include_action_items }, { authInfo }) => {
      const userId = authInfo?.extra?.userId as string | undefined
      if (!userId) {
        return err('Unauthorized.')
      }

      try {
        const client = createFathomClient(userId)
        const iter = await client.listMeetings({
          cursor,
          includeActionItems: include_action_items,
        })

        let meetings: MeetingListItem[] = []
        let nextCursor: string | null = null

        for await (const page of iter) {
          if (!page) {
            break
          }

          meetings = page.result.items.map((m) => ({
            actionItems:
              m.actionItems?.map((a) => ({
                assignee: {
                  email: a.assignee.email,
                  name: a.assignee.name,
                  team: a.assignee.team,
                },
                completed: a.completed,
                description: a.description,
                recordingPlaybackUrl: a.recordingPlaybackUrl,
                recordingTimestamp: a.recordingTimestamp,
                userGenerated: a.userGenerated,
              })) ?? undefined,
            id: m.recordingId,
            invitees: m.calendarInvitees.map((i) => ({
              email: i.email,
              emailDomain: i.emailDomain,
              isExternal: i.isExternal,
              name: i.name,
            })),
            meetingTitle: m.meetingTitle,
            recordedBy: m.recordedBy.name,
            recordingEnd: m.recordingEndTime.toISOString(),
            recordingStart: m.recordingStartTime.toISOString(),
            scheduledEnd: m.scheduledEndTime.toISOString(),
            scheduledStart: m.scheduledStartTime.toISOString(),
            shareUrl: m.shareUrl,
            title: m.title,
            url: m.url,
          }))
          nextCursor = page.result.nextCursor
          break
        }

        const result: MeetingListResult = { meetings, nextCursor }
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as Record<string, unknown>,
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await server.server.sendLoggingMessage({
          level: 'error',
          data: `list_meetings: ${msg}`,
        })
        return err(`Failed to list meetings: ${msg}`)
      }
    }
  )
}

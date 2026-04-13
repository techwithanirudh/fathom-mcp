import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerRecentMeetingsPrompt(server: McpServer) {
  server.registerPrompt(
    'recent_meetings',
    {
      title: 'Fathom: Recent Meetings',
      description:
        'Summarise what happened across your most recent Fathom meetings.',
      argsSchema: {
        count: z
          .string()
          .optional()
          .describe('How many meetings to look at (default: 5).'),
      },
    },
    ({ count }) => {
      const n = count ?? '5'
      return {
        description: 'Summarise recent Fathom meetings',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please summarise my ${n} most recent Fathom meetings. For each meeting, include the title, date, duration, attendees, and key topics or outcomes. Use the list_meetings tool to fetch the data. If summaries are available (include_summary=true) use them; otherwise derive the highlights from the transcript (include_transcript=true).`,
            },
          },
        ],
      }
    }
  )
}

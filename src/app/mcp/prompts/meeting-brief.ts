import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerMeetingBriefPrompt(server: McpServer) {
  server.registerPrompt(
    'meeting_brief',
    {
      title: 'Fathom: Meeting Brief',
      description:
        'Get a full brief on a specific meeting: summary, key decisions, action items, and notable transcript moments.',
      argsSchema: {
        recording_id: z
          .string()
          .describe('The recording ID from list_meetings.'),
      },
    },
    ({ recording_id }) => ({
      description: 'Full brief for a single meeting',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please brief me on Fathom recording ${recording_id}. Fetch the summary with get_summary and the transcript with get_transcript. Then produce a structured brief with these sections:

1. **Overview** — title, date, duration, attendees
2. **Summary** — the AI-generated summary (or your own if unavailable)
3. **Key Decisions** — any decisions that were reached
4. **Action Items** — who owns what
5. **Notable Moments** — any important quotes or exchanges from the transcript (with timestamps)`,
          },
        },
      ],
    })
  )
}

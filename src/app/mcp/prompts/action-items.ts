import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerActionItemsPrompt(server: McpServer) {
  server.registerPrompt(
    'action_items',
    {
      title: 'Fathom: Action Items',
      description:
        'List all open action items from your recent Fathom meetings.',
      argsSchema: {
        assignee: z
          .string()
          .optional()
          .describe(
            'Filter to action items assigned to this person (name or email). Omit to see all.'
          ),
      },
    },
    ({ assignee }) => {
      const filter = assignee
        ? ` Focus only on items assigned to "${assignee}".`
        : ' Include items for all assignees.'
      return {
        description: 'List open action items from recent meetings',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please fetch my recent Fathom meetings with action items included (use list_meetings with include_action_items=true). List every open (not completed) action item as a checklist grouped by meeting.${filter} For each item show: the description, assignee name/email, and a link to the recording timestamp if available.`,
            },
          },
        ],
      }
    }
  )
}

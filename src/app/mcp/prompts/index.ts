import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerActionItemsPrompt } from './action-items'
import { registerMeetingBriefPrompt } from './meeting-brief'
import { registerRecentMeetingsPrompt } from './recent-meetings'

export function registerPrompts(server: McpServer) {
  registerRecentMeetingsPrompt(server)
  registerActionItemsPrompt(server)
  registerMeetingBriefPrompt(server)
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { getSummaryTool } from './get-summary'
import { getTranscriptTool } from './get-transcript'
import { listMeetingsTool } from './list-meetings'
import { listTeamMembersTool } from './list-team-members'
import { listTeamsTool } from './list-teams'

export function registerTools(server: McpServer) {
  listMeetingsTool(server)
  getTranscriptTool(server)
  getSummaryTool(server)
  listTeamsTool(server)
  listTeamMembersTool(server)
}

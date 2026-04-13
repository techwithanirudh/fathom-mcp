import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerMeetingSummary } from './meeting-summary'
import { registerMeetingTranscript } from './meeting-transcript'

export function registerResources(server: McpServer) {
  registerMeetingTranscript(server)
  registerMeetingSummary(server)
}

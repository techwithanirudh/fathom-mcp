import { createMcpHandler, withMcpAuth } from 'mcp-handler'

import { env } from '@/env'
import { resourceMetadataPath, verifyAccessToken } from '@/server/mcp-auth'
import { registerResources } from './resources'
import { registerGetSummary } from './tools/get-summary'
import { registerGetTranscript } from './tools/get-transcript'
import { registerListMeetings } from './tools/list-meetings'
import { registerListTeamMembers } from './tools/list-team-members'
import { registerListTeams } from './tools/list-teams'

const mcpHandler = createMcpHandler(
  (server) => {
    registerResources(server)
    registerListMeetings(server)
    registerGetTranscript(server)
    registerGetSummary(server)
    registerListTeams(server)
    registerListTeamMembers(server)
  },
  {
    serverInfo: { name: 'fathom-mcp', version: '1.0.0' },
    instructions: `You are connected to Fathom, an AI meeting recorder. Use these tools to answer questions about meetings, transcripts, summaries, and team members.

Tool guidance:
- list_meetings: Start here. Use cursor for pagination to find recordings and IDs.
- get_transcript: Use when you need a single meeting's transcript by recording ID.
- get_summary: Fetch the AI-generated summary for a single recording by recording ID.
- list_teams / list_team_members: Use to understand workspace structure or filter meetings by team.

General tips:
- Recording IDs come from list_meetings. Always call list_meetings first if you don't have one.
- All paginated tools return nextCursor — use it to page through more results.
- Transcripts include speaker names and timestamps relative to recording start (HH:MM:SS).
- Action items and summaries are in English regardless of the meeting language.`,
  }
)

const handler = withMcpAuth(mcpHandler, verifyAccessToken, {
  required: true,
  resourceUrl: env.NEXT_PUBLIC_BASE_URL,
  resourceMetadataPath,
  requiredScopes: ['mcp'],
})

export { handler as GET, handler as POST, handler as DELETE }

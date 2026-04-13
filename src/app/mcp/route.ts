import { createMcpHandler, withMcpAuth } from 'mcp-handler'

import { env } from '@/env'
import { verifyToken } from '@/server/tokens'
import { registerPrompts } from './prompts'
import { registerResources } from './resources'
import { registerTools } from './tools'

const mcpHandler = createMcpHandler(
  (server) => {
    registerPrompts(server)
    registerResources(server)
    registerTools(server)
  },
  {
    serverInfo: { name: 'fathom-mcp', version: '1.0.0' },
    instructions: `You are connected to Fathom, an AI meeting recorder. Use these tools to answer questions about meetings, transcripts, summaries, and team members.

Tool guidance:
- list_meetings: Start here. Use cursor for pagination. Pass include_transcript=true to get transcripts inline — prefer this over calling get_transcript separately when you need transcripts for multiple meetings.
- get_transcript: Use when you need a single meeting's transcript by recording ID. It pages through recordings to find the match, so list_meetings with include_transcript=true is more efficient for recent meetings.
- get_summary: Fetches the AI-generated meeting summary for a single recording. Pass include_summary=true to list_meetings instead if you need summaries for multiple meetings.
- list_teams / list_team_members: Use to understand workspace structure or filter meetings by team.

General tips:
- Recording IDs come from list_meetings. Always call list_meetings first if you don't have one.
- All paginated tools return nextCursor — use it to page through more results.
- Transcripts include speaker names and timestamps relative to recording start (HH:MM:SS).
- Action items and summaries are in English regardless of the meeting language.`,
  }
)

const handler = withMcpAuth(
  mcpHandler,
  (_req, bearerToken) => {
    if (!bearerToken) {
      return undefined
    }
    return verifyToken(bearerToken)
  },
  { required: true, resourceUrl: `${env.NEXT_PUBLIC_BASE_URL}/mcp` }
)

export { handler as GET, handler as POST, handler as DELETE }

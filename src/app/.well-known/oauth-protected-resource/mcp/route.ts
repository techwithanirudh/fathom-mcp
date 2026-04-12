import { metadataCorsOptionsRequestHandler } from 'mcp-handler'

export const OPTIONS = metadataCorsOptionsRequestHandler()

export const GET = (request: Request) => {
  const resource = new URL('/mcp', request.url).toString()

  return Response.json({
    authorization_servers: [],
    resource,
    scopes_supported: ['mcp'],
  })
}

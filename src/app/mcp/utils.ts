export const err = (text: string) => ({
  isError: true as const,
  content: [{ type: 'text' as const, text }],
})

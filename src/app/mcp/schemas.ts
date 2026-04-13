import { z } from 'zod'

export const inviteeSchema = z.object({
  email: z.string().nullable(),
  emailDomain: z.string().nullable(),
  isExternal: z.boolean(),
  name: z.string().nullable(),
})

export const transcriptSpeakerSchema = z.object({
  displayName: z.string(),
  matchedCalendarInviteeEmail: z.string().nullable().optional(),
})

export const transcriptItemSchema = z.object({
  speaker: transcriptSpeakerSchema,
  text: z.string(),
  timestamp: z.string(),
})

export const actionItemAssigneeSchema = z.object({
  email: z.string().nullable(),
  name: z.string().nullable(),
  team: z.string().nullable(),
})

export const actionItemSchema = z.object({
  assignee: actionItemAssigneeSchema,
  completed: z.boolean(),
  description: z.string(),
  recordingPlaybackUrl: z.string(),
  recordingTimestamp: z.string(),
  userGenerated: z.boolean(),
})

export const summarySchema = z.object({
  markdownFormatted: z.string().nullable(),
  templateName: z.string().nullable(),
})

export const meetingItemSchema = z.object({
  actionItems: z.array(actionItemSchema).optional(),
  id: z.number(),
  invitees: z.array(inviteeSchema),
  meetingTitle: z.string().nullable(),
  recordedBy: z.string(),
  recordingEnd: z.string(),
  recordingStart: z.string(),
  scheduledEnd: z.string(),
  scheduledStart: z.string(),
  shareUrl: z.string(),
  summary: summarySchema.optional(),
  title: z.string(),
  transcript: z.array(transcriptItemSchema).optional(),
  url: z.string(),
})

export const meetingListOutputSchema = {
  meetings: z.array(meetingItemSchema),
  nextCursor: z.string().nullable(),
}

export const transcriptOutputSchema = {
  transcript: z.array(transcriptItemSchema),
}

export const summaryOutputSchema = {
  summary: summarySchema.nullable(),
}

export const teamItemSchema = z.object({
  createdAt: z.string(),
  name: z.string(),
})

export const teamListOutputSchema = {
  nextCursor: z.string().nullable(),
  teams: z.array(teamItemSchema),
}

export const teamMemberItemSchema = z.object({
  createdAt: z.string(),
  email: z.string(),
  name: z.string(),
})

export const teamMemberListOutputSchema = {
  members: z.array(teamMemberItemSchema),
  nextCursor: z.string().nullable(),
}

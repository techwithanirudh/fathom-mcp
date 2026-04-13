export interface MeetingInvitee {
  email: string | null
  emailDomain: string | null
  isExternal: boolean
  name: string | null
}

export interface MeetingListItem {
  actionItems?: ActionItem[]
  id: number
  invitees: MeetingInvitee[]
  meetingTitle: string | null
  recordedBy: string
  recordingEnd: Date
  recordingStart: Date
  scheduledEnd: Date
  scheduledStart: Date
  shareUrl: string
  title: string
  url: string
}

export interface MeetingListResult {
  meetings: MeetingListItem[]
  nextCursor: string | null
}

export interface TranscriptSpeaker {
  displayName: string
  matchedCalendarInviteeEmail?: string | null
}

export interface TranscriptItem {
  speaker: TranscriptSpeaker
  text: string
  timestamp: string
}

export interface TranscriptResult {
  transcript: TranscriptItem[]
}

export interface ActionItemAssignee {
  email: string | null
  name: string | null
  team: string | null
}

export interface ActionItem {
  assignee: ActionItemAssignee
  completed: boolean
  description: string
  recordingPlaybackUrl: string
  recordingTimestamp: string
  userGenerated: boolean
}

export interface MeetingSummary {
  markdownFormatted: string | null
  templateName: string | null
}

export interface SummaryResult {
  summary: MeetingSummary | null
}

export interface Team {
  createdAt: Date
  name: string
}

export interface TeamListResult {
  nextCursor: string | null
  teams: Team[]
}

export interface TeamMember {
  createdAt: Date
  email: string
  name: string
}

export interface TeamMemberListResult {
  members: TeamMember[]
  nextCursor: string | null
}

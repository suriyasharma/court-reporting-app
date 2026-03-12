export const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  RETURNED: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  PAID: 'bg-purple-100 text-purple-700',
  DISPUTED: 'bg-red-100 text-red-700',
  CLOSED: 'bg-gray-200 text-gray-600',
}

export const typeColors = {
  STANDARD: 'bg-gray-100 text-gray-700',
  LATE_CANCEL: 'bg-red-100 text-red-700',
  CNA: 'bg-amber-100 text-amber-700',
}

export const typeLabels = {
  STANDARD: 'Standard',
  LATE_CANCEL: 'Late Cancellation',
  CNA: 'CNA',
}

export const JOB_FIELDS = [
  { key: 'deposition_id', label: 'Deposition ID', type: 'text' },
  { key: 'deposition_name', label: 'Deposition Name', type: 'text' },
  { key: 'deposition_status', label: 'Status', type: 'select', options: ['UPCOMING','ONGOING','PAST','CANCELLED','SPLIT','PROCESSING','DATA_ENTRY'] },
  { key: 'deposition_datetime', label: 'Start Date/Time', type: 'datetime-local' },
  { key: 'event_state', label: 'State', type: 'text' },
  { key: 'bo_event_link', label: 'BO Event Link', type: 'url' },
  { key: 'bo_recording_link', label: 'BO Recording Link', type: 'url' },
  { key: 'organization_name', label: 'Organization', type: 'text' },
  { key: 'format', label: 'Format', type: 'select', options: ['REMOTE','ON_SITE',''] },
  { key: 'need_reporter', label: 'Need Reporter', type: 'select', options: ['true','false'] },
  { key: 'need_steno', label: 'Need Steno', type: 'select', options: ['true','false'] },
  { key: 'need_video', label: 'Need Video', type: 'select', options: ['true','false'] },
  { key: 'certified_transcript_requested_at', label: 'Transcript Requested At', type: 'datetime-local' },
  { key: 'transcript_due_date', label: 'Transcript Due Date', type: 'text' },
  { key: 'recording_status', label: 'Recording Status', type: 'select', options: ['DEPOSITION_DRAFT','MANUAL_TRANSCRIPTION','UPLOADED','WAITING_FOR_MANUAL_APPROVAL','ERROR',''] },
  { key: 'turnaround_type', label: 'Turnaround Type', type: 'select', options: ['Standard Turnaround',''] },
  { key: 'reporter_name', label: 'Reporter', type: 'text' },
]

export const RECORDING_STATUS_LABELS = {
  DEPOSITION_DRAFT: 'Deposition Draft',
  MANUAL_TRANSCRIPTION: 'Manual Transcription',
  UPLOADED: 'Uploaded',
  WAITING_FOR_MANUAL_APPROVAL: 'Waiting for Manual Approval',
  ERROR: 'Error',
}

export const STATUS_COLORS = {
  UPCOMING: 'bg-blue-100 text-blue-700',
  ONGOING: 'bg-green-100 text-green-700',
  PAST: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
  SPLIT: 'bg-purple-100 text-purple-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  DATA_ENTRY: 'bg-orange-100 text-orange-700',
}

export const REQUIRED_JOB_FIELDS = [
  'deposition_id','deposition_name','deposition_status','deposition_datetime',
  'event_state','organization_name','format','need_reporter','need_steno',
  'need_video','recording_status',
]

import { z } from 'zod';
import { RunStatus } from '@prisma/client';

// Generic login configuration schemas
export const loginFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  selector: z.string().min(1, 'CSS selector is required'),
  type: z.enum(['text', 'password', 'email', 'tel', 'submit', 'button']),
  required: z.boolean().default(true),
  value: z.string().optional(), // For static values or field mapping
});

export const loginStepSchema = z.object({
  name: z.string().min(1, 'Step name is required'),
  type: z.enum(['navigate', 'fill', 'click', 'wait', 'verify']),
  selector: z.string().optional(),
  value: z.string().optional(),
  timeout: z.number().positive().default(10000),
  waitFor: z.enum(['selector', 'navigation', 'network']).default('selector'),
  expectedUrl: z.string().optional(),
  successIndicators: z.array(z.string()).optional(), // CSS selectors or text patterns
  errorIndicators: z.array(z.string()).optional(), // CSS selectors or text patterns
});

// loginTemplateSchema removed - using screen recording approach instead

// Login schemas
export const createLoginSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  loginUrl: z.string().url('Invalid URL').min(1, 'Login URL is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional(),
  oauthToken: z.string().optional(),
  // Template-based configuration removed - using screen recording approach instead
  // Test immediately on creation
  testOnCreate: z.boolean().default(true),
}).refine(
  (data) => data.password || data.oauthToken,
  {
    message: 'Either password or oauthToken must be provided',
    path: ['password'],
  }
);

export const updateLoginSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  loginUrl: z.string().url('Invalid URL').optional(),
  username: z.string().min(1, 'Username is required').optional(),
  password: z.string().optional(),
  oauthToken: z.string().optional(),
});

// Base metadata schema for all actions
export const actionMetadataSchema = z.object({
  selector: z.string().min(1, 'Selector is required'),
  tag: z.string().min(1, 'HTML tag is required'),
  type: z.string().nullable().optional(), // Input type (text, password, etc.)
  innerText: z.string().nullable().optional(), // Text content of the element
  ariaLabel: z.string().nullable().optional(), // ARIA label for accessibility
  placeholder: z.string().nullable().optional(), // Input placeholder text
  timestamp: z.number().min(0, 'Timestamp must be non-negative'),
  intent: z.string().nullable().optional(), // LLM-generated intent description
});

// Agent config schema for automation steps (structured actions with rich metadata)
export const agentActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('goto'),
    url: z.string().url('Invalid URL'),
    metadata: actionMetadataSchema.omit({ selector: true }).optional(),
  }),
  z.object({
    action: z.literal('type'),
    selector: z.string().min(1, 'Selector is required'),
    value: z.string().min(1, 'Value is required'),
    metadata: actionMetadataSchema,
  }),
  z.object({
    action: z.literal('click'),
    selector: z.string().min(1, 'Selector is required'),
    metadata: actionMetadataSchema,
  }),
  z.object({
    action: z.literal('waitForSelector'),
    selector: z.string().min(1, 'Selector is required'),
    timeout: z.number().positive().optional(),
    metadata: actionMetadataSchema,
  }),
  z.object({
    action: z.literal('download'),
    selector: z.string().min(1, 'Selector is required'),
    metadata: actionMetadataSchema,
  }),
]);

export const agentConfigSchema = z.array(agentActionSchema);

// Agent intent schema for LLM annotations
export const agentIntentSchema = z.object({
  action: z.string(), // Action type (goto, click, type, etc.)
  selector: z.string().optional(), // Original selector
  intent: z.string(), // Human-readable intent description
  stepIndex: z.number(), // Index in the agent config array
  metadata: z.record(z.string(), z.any()).optional(), // Additional context
});

export const agentIntentsSchema = z.array(agentIntentSchema);

// Agent schemas
export const createAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  schedule: z.string().optional(), // cron string or JSON
  loginIds: z.array(z.string()).min(1, 'At least one login must be selected'),
  agentConfig: agentConfigSchema,
  purposePrompt: z.string().min(1, 'Purpose prompt is required'), // User's natural language description
  agentIntents: agentIntentsSchema.optional(), // LLM annotations
});

export const updateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  description: z.string().optional(),
  schedule: z.string().optional(),
  loginIds: z.array(z.string()).optional(),
  agentConfig: agentConfigSchema.optional(),
  purposePrompt: z.string().optional(), // User's natural language description
  agentIntents: agentIntentsSchema.optional(), // LLM annotations
});

// Agent run schemas
export const createAgentRunSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
});

export const updateAgentRunSchema = z.object({
  status: z.nativeEnum(RunStatus),
  logs: z.record(z.string(), z.any()).optional(),
  outputPath: z.string().optional(),
  screenshotPath: z.string().optional(),
});

// Response schemas (with masked credentials)
export const loginResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  loginUrl: z.string(),
  username: z.string(), // masked
  password: z.string().optional(), // masked
  oauthToken: z.string().optional(), // masked
  ownerId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const agentResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string(),
  schedule: z.string().nullable(),
  agentConfig: agentConfigSchema,
  purposePrompt: z.string().nullable(),
  agentIntents: agentIntentsSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  logins: z.array(z.object({
    id: z.string(),
    name: z.string(),
    loginUrl: z.string(),
  })).optional(),
  latestRuns: z.array(z.object({
    id: z.string(),
    status: z.nativeEnum(RunStatus),
    startedAt: z.date(),
    finishedAt: z.date().nullable(),
    userConfirmed: z.boolean().nullable(),
    userFeedback: z.string().nullable(),
  })).optional(),
});

export const agentRunResponseSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
  status: z.nativeEnum(RunStatus),
  logs: z.record(z.string(), z.any()).nullable(),
  outputPath: z.string().nullable(),
  screenshotPath: z.string().nullable(),
  userConfirmed: z.boolean().nullable(),
  userFeedback: z.string().nullable(),
  createdAt: z.date(),
});

// Confirmation schemas
export const confirmAgentRunSchema = z.object({
  activateAgent: z.boolean().optional().default(false),
});

export const rejectAgentRunSchema = z.object({
  feedback: z.string().min(1, 'Feedback is required').max(1000, 'Feedback too long'),
});

// Workflow recording schemas
export const recordWorkflowSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(255, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  purposePrompt: z.string().min(1, 'Purpose prompt is required'), // What the user wants to achieve
  recordedSteps: agentConfigSchema, // Raw recorded actions
  loginIds: z.array(z.string()).min(1, 'At least one login must be selected'),
});

export const annotateWorkflowSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  purposePrompt: z.string().min(1, 'Purpose prompt is required'),
  recordedSteps: agentConfigSchema,
});

export const repairSelectorSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  stepIndex: z.number().min(0, 'Step index must be non-negative'),
  failedSelector: z.string().min(1, 'Failed selector is required'),
  domSnapshot: z.string().min(1, 'DOM snapshot is required'),
  intent: z.string().min(1, 'Intent is required'),
});

// Enhanced event log schemas for multi-signal capture
export const eventLogEntrySchema = z.object({
  step: z.number().min(0, 'Step must be non-negative'),
  action: z.enum(['navigate', 'click', 'type', 'wait', 'scroll', 'hover', 'select']),
  target: z.string().optional(), // CSS selector or element identifier
  value: z.string().optional(), // Input value (excludes passwords for security)
  url: z.string().url().optional(), // Current page URL
  elementType: z.string().optional(), // HTML element type (input, button, etc.)
  elementText: z.string().optional(), // Text content of the element
  screenshotUrl: z.string().optional(), // URL to stored screenshot file
  screenshot: z.string().optional(), // Inline base64 screenshot (will be processed and stored)
  timestamp: z.number().min(0, 'Timestamp must be non-negative'),
}).refine(
  (data) => {
    // Exclude password values for security
    if (data.value && (
      data.target?.toLowerCase().includes('password') ||
      data.elementType?.toLowerCase().includes('password') ||
      data.target?.toLowerCase().includes('pass')
    )) {
      return false;
    }
    return true;
  },
  {
    message: 'Password values are not allowed in event logs for security reasons',
    path: ['value'],
  }
);

export const eventLogSchema = z.array(eventLogEntrySchema);

// Enhanced record workflow schema with event log support
export const recordWorkflowWithEventsSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(255, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  purposePrompt: z.string().min(1, 'Purpose prompt is required'),
  eventLog: eventLogSchema.optional(), // Enhanced event log with screenshots
  transcript: z.string().max(10000, 'Transcript too long').optional(),
  loginIds: z.array(z.string()).min(1, 'At least one login must be selected'),
});

// Enhanced summarization schema
export const summarizeWithEventsSchema = z.object({
  eventLog: eventLogSchema,
  transcript: z.string().max(10000, 'Transcript too long').optional(),
});

// Workflow Schedule schemas
export const WorkflowScheduleSchema = z.object({
  id: z.string().min(1, 'Schedule ID is required'),
  workflowId: z.string().min(1, 'Workflow ID is required'),
  name: z.string().min(1, 'Schedule name is required').max(255, 'Name too long').optional(),
  cronExpression: z.string().min(1, 'Cron expression is required'),
  timezone: z.string().default('UTC'),
  isActive: z.boolean().default(true),
  runConfig: z.record(z.any()).optional(),
  variables: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  nextRunAt: z.date().optional(),
  lastRunAt: z.date().optional(),
});

export const CreateWorkflowScheduleSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  name: z.string().min(1, 'Schedule name is required').max(255, 'Name too long').optional(),
  cronExpression: z.string().min(1, 'Cron expression is required'),
  timezone: z.string().default('UTC'),
  isActive: z.boolean().default(true),
  runConfig: z.record(z.any()).optional(),
  variables: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const UpdateWorkflowScheduleSchema = z.object({
  name: z.string().min(1, 'Schedule name is required').max(255, 'Name too long').optional(),
  cronExpression: z.string().min(1, 'Cron expression is required').optional(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
  runConfig: z.record(z.any()).optional(),
  variables: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

// Type exports
export type LoginField = z.infer<typeof loginFieldSchema>;
export type LoginStep = z.infer<typeof loginStepSchema>;
// LoginTemplate type removed - using screen recording approach instead
export type CreateLoginInput = z.infer<typeof createLoginSchema>;
export type UpdateLoginInput = z.infer<typeof updateLoginSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type CreateAgentRunInput = z.infer<typeof createAgentRunSchema>;
export type UpdateAgentRunInput = z.infer<typeof updateAgentRunSchema>;
export type ActionMetadata = z.infer<typeof actionMetadataSchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
export type AgentConfig = z.infer<typeof agentConfigSchema>;
export type AgentIntent = z.infer<typeof agentIntentSchema>;
export type AgentIntents = z.infer<typeof agentIntentsSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type AgentResponse = z.infer<typeof agentResponseSchema>;
export type AgentRunResponse = z.infer<typeof agentRunResponseSchema>;
export type ConfirmAgentRunInput = z.infer<typeof confirmAgentRunSchema>;
export type RejectAgentRunInput = z.infer<typeof rejectAgentRunSchema>;
export type RecordWorkflowInput = z.infer<typeof recordWorkflowSchema>;
export type AnnotateWorkflowInput = z.infer<typeof annotateWorkflowSchema>;
export type RepairSelectorInput = z.infer<typeof repairSelectorSchema>;
export type EventLogEntry = z.infer<typeof eventLogEntrySchema>;
export type EventLog = z.infer<typeof eventLogSchema>;
export type RecordWorkflowWithEventsInput = z.infer<typeof recordWorkflowWithEventsSchema>;
export type SummarizeWithEventsInput = z.infer<typeof summarizeWithEventsSchema>;
export type WorkflowSchedule = z.infer<typeof WorkflowScheduleSchema>;
export type CreateWorkflowScheduleInput = z.infer<typeof CreateWorkflowScheduleSchema>;
export type UpdateWorkflowScheduleInput = z.infer<typeof UpdateWorkflowScheduleSchema>;

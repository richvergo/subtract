/**
 * Zod Schemas for Enterprise Agent System
 * Comprehensive validation schemas for all agent-related data structures
 */

import { z } from 'zod'

// Enums
export const ActionType = z.enum([
  'click',
  'type',
  'select',
  'navigate',
  'scroll',
  'wait',
  'hover',
  'double_click',
  'right_click',
  'drag_drop',
  'key_press',
  'screenshot',
  'custom'
])

export const VariableKind = z.enum([
  'string',
  'number',
  'boolean',
  'array',
  'object',
  'date',
  'file',
  'url',
  'email',
  'phone'
])

export const VariableSource = z.enum([
  'user_input',
  'api_response',
  'file_upload',
  'environment',
  'computed',
  'random',
  'timestamp'
])

export const WorkflowStatus = z.enum([
  'draft',
  'active',
  'paused',
  'archived',
  'error',
  'testing'
])

export const RunStepStatus = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
  'retrying'
])

// Base schemas
export const Action = z.object({
  id: z.string().min(1),
  type: ActionType,
  selector: z.string().min(1),
  value: z.string().optional(),
  url: z.string().url().optional(),
  coordinates: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  waitFor: z.string().optional(),
  timeout: z.number().positive().optional(),
  retryCount: z.number().nonnegative().optional(),
  dependencies: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

export const VariableDef = z.object({
  name: z.string().min(1),
  type: VariableKind,
  description: z.string().optional(),
  defaultValue: z.any().optional(),
  required: z.boolean().default(false),
  source: VariableSource.optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    options: z.array(z.string()).optional()
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

// Rule and Loop schemas for natural language processing
export const RuleOperator = z.enum(['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'not_in', 'contains', 'not_contains'])

export const Rule = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  condition: z.object({
    variable: z.string().min(1),
    operator: RuleOperator,
    value: z.any(),
    metadata: z.record(z.string(), z.any()).optional()
  }),
  action: z.object({
    type: z.enum(['skip', 'retry', 'wait', 'execute', 'skip_empty']),
    value: z.any().optional(),
    metadata: z.record(z.string(), z.any()).optional()
  }),
  priority: z.number().default(0),
  enabled: z.boolean().default(true),
  metadata: z.record(z.string(), z.any()).optional()
})

export const Loop = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  variable: z.string().min(1), // Must reference a list-typed variable
  iterator: z.string().min(1), // Variable name for current iteration
  actions: z.array(z.string()), // Array of action IDs to execute in loop
  maxIterations: z.number().positive().optional(),
  breakCondition: z.object({
    variable: z.string().min(1),
    operator: RuleOperator,
    value: z.any()
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

export const LogicSpec = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  actions: z.array(Action),
  variables: z.array(VariableDef),
  rules: z.array(Rule).optional(),
  loops: z.array(Loop).optional(),
  settings: z.object({
    timeout: z.number().positive().default(30000),
    retryAttempts: z.number().nonnegative().default(3),
    screenshotOnError: z.boolean().default(true),
    debugMode: z.boolean().default(false),
    parallelExecution: z.boolean().default(false)
  }),
  metadata: z.record(z.string(), z.any()).optional()
})

export const RunRequest = z.object({
  workflowId: z.string().min(1),
  variables: z.record(z.string(), z.any()).optional(),
  settings: z.object({
    timeout: z.number().positive().optional(),
    retryAttempts: z.number().nonnegative().optional(),
    screenshotOnError: z.boolean().optional(),
    debugMode: z.boolean().optional()
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

export const RunLog = z.object({
  id: z.string().min(1),
  timestamp: z.number(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  actionId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

// Workflow schemas
// Login configuration schema
export const LoginConfigSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  url: z.string().url(),
  tenant: z.string().optional(),
  options: z.record(z.string(), z.any()).optional()
})

// Domain scope configuration schema
export const DomainScopeConfigSchema = z.object({
  baseDomain: z.string().min(1, 'Base domain is required'),
  allowedDomains: z.array(z.string()).optional().default([]),
  ssoProviders: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.any()).optional()
})

// Navigation event schema
export const NavigationEventSchema = z.object({
  url: z.string().url(),
  domain: z.string(),
  allowed: z.boolean(),
  reason: z.enum(['base_domain', 'subdomain', 'sso_provider', 'explicit_allowlist', 'denied']),
  timestamp: z.number(),
  metadata: z.record(z.string(), z.any()).optional()
})

export const Workflow = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: WorkflowStatus,
  version: z.string().default('1.0.0'),
  requiresLogin: z.boolean().default(false),
  loginConfig: LoginConfigSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  ownerId: z.string().min(1),
  logicSpec: LogicSpec,
  metadata: z.record(z.string(), z.any()).optional()
})

export const WorkflowAction = z.object({
  id: z.string().min(1),
  workflowId: z.string().min(1),
  action: Action,
  order: z.number().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const WorkflowVariable = z.object({
  id: z.string().min(1),
  workflowId: z.string().min(1),
  variable: VariableDef,
  createdAt: z.date(),
  updatedAt: z.date()
})

export const WorkflowRun = z.object({
  id: z.string().min(1),
  workflowId: z.string().min(1),
  status: RunStepStatus,
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  variables: z.record(z.string(), z.any()).optional(),
  result: z.record(z.any()).optional(),
  error: z.string().optional(),
  logs: z.array(RunLog).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

export const WorkflowRunStep = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  actionId: z.string().min(1),
  status: RunStepStatus,
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  result: z.record(z.any()).optional(),
  error: z.string().optional(),
  logs: z.array(RunLog).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

// API request/response schemas
export const CreateWorkflowRequest = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  logicSpec: LogicSpec,
  requiresLogin: z.boolean().optional(),
  loginConfig: LoginConfigSchema.optional()
})

export const UpdateWorkflowRequest = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  logicSpec: LogicSpec.optional(),
  status: WorkflowStatus.optional(),
  requiresLogin: z.boolean().optional(),
  loginConfig: LoginConfigSchema.optional()
})

export const ExecuteWorkflowRequest = z.object({
  workflowId: z.string().min(1),
  variables: z.record(z.string(), z.any()).optional(),
  settings: z.object({
    timeout: z.number().positive().optional(),
    retryAttempts: z.number().nonnegative().optional(),
    screenshotOnError: z.boolean().optional(),
    debugMode: z.boolean().optional()
  }).optional()
})

export const WorkflowResponse = z.object({
  success: z.boolean(),
  data: Workflow.optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

export const WorkflowListResponse = z.object({
  success: z.boolean(),
  data: z.array(Workflow).optional(),
  error: z.string().optional(),
  metadata: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number()
  }).optional()
})

export const WorkflowRunResponse = z.object({
  success: z.boolean(),
  data: WorkflowRun.optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
})


// Validation helpers
export const validateAction = (action: unknown) => Action.parse(action)
export const validateVariableDef = (variable: unknown) => VariableDef.parse(variable)
export const validateLogicSpec = (spec: unknown) => LogicSpec.parse(spec)
export const validateRunRequest = (request: unknown) => RunRequest.parse(request)
export const validateWorkflow = (workflow: unknown) => Workflow.parse(workflow)
export const validateLoginConfig = (config: unknown) => LoginConfigSchema.parse(config)
export const validateDomainScopeConfig = (config: unknown) => DomainScopeConfigSchema.parse(config)
export const validateNavigationEvent = (event: unknown) => NavigationEventSchema.parse(event)

// Type exports
export type Action = z.infer<typeof Action>
export type VariableDef = z.infer<typeof VariableDef>
export type Rule = z.infer<typeof Rule>
export type Loop = z.infer<typeof Loop>
export type LogicSpec = z.infer<typeof LogicSpec>
export type RunRequest = z.infer<typeof RunRequest>
export type RunLog = z.infer<typeof RunLog>
export type Workflow = z.infer<typeof Workflow>
export type WorkflowAction = z.infer<typeof WorkflowAction>
export type WorkflowVariable = z.infer<typeof WorkflowVariable>
export type WorkflowRun = z.infer<typeof WorkflowRun>
export type WorkflowRunStep = z.infer<typeof WorkflowRunStep>
export type CreateWorkflowRequest = z.infer<typeof CreateWorkflowRequest>
export type UpdateWorkflowRequest = z.infer<typeof UpdateWorkflowRequest>
export type ExecuteWorkflowRequest = z.infer<typeof ExecuteWorkflowRequest>
export type WorkflowResponse = z.infer<typeof WorkflowResponse>
export type WorkflowListResponse = z.infer<typeof WorkflowListResponse>
export type WorkflowRunResponse = z.infer<typeof WorkflowRunResponse>
export type LoginConfig = z.infer<typeof LoginConfigSchema>
export type DomainScopeConfig = z.infer<typeof DomainScopeConfigSchema>
export type NavigationEvent = z.infer<typeof NavigationEventSchema>

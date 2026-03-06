/**
 * Shared TypeScript type definitions for Eval Hub UI
 * Generated from API contract specification
 *
 * These types ensure frontend-backend type consistency and are used across:
 * - Frontend components and pages
 * - Frontend API client services
 * - BFF API handlers (via code generation)
 */

// ============================================================================
// Evaluation Types
// ============================================================================

export type EvaluationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface EvaluationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface Evaluation {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  modelId: string;
  modelName: string;
  modelVersion?: string;
  tasks: string[];
  parameters?: Record<string, unknown>;
  status: EvaluationStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
  error?: EvaluationError;
  resultsSummary?: {
    overallScore: number;
    tasksCompleted: number;
    tasksFailed: number;
  };
  metadata?: Record<string, unknown>;
}

export interface CreateEvaluationRequest {
  name?: string;
  description?: string;
  modelId: string;
  tasks: string[];
  parameters?: Record<string, unknown>;
}

export interface EvaluationListResponse {
  items: Evaluation[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface EvaluationFilters {
  status?: EvaluationStatus;
  modelId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Evaluation Result Types
// ============================================================================

export type TaskResultStatus = 'completed' | 'failed' | 'skipped';

export interface TaskResult {
  taskId: string;
  taskName: string;
  status: TaskResultStatus;
  metrics: Record<string, number | string>;
  samples: number;
  executionTime: number; // in seconds
  error?: string;
}

export interface EvaluationResult {
  evaluationId: string;
  overallMetrics: {
    accuracy: number;
    averageLatency: number;
    totalSamples: number;
    [key: string]: number; // Allow additional metrics
  };
  taskResults: TaskResult[];
  generatedAt: string;
  dataVersion: string;
}

export type ExportFormat = 'json' | 'csv';

// ============================================================================
// Template Types
// ============================================================================

export interface ModelSelection {
  modelId?: string | null;
  modelType?: string;
  runtime?: string;
}

export interface Template {
  id: string;
  userId: string;
  name: string;
  description?: string;
  modelSelection?: ModelSelection | null;
  tasks: string[];
  parameters?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  isPublic: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  modelSelection?: ModelSelection | null;
  tasks: string[];
  parameters?: Record<string, unknown>;
  isPublic?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  modelSelection?: ModelSelection | null;
  tasks?: string[];
  parameters?: Record<string, unknown>;
  isPublic?: boolean;
}

// ============================================================================
// Task Types
// ============================================================================

export type TaskCategory =
  | 'reasoning'
  | 'knowledge'
  | 'comprehension'
  | 'generation'
  | 'truthfulness'
  | 'safety'
  | 'multilingual';

export type ParameterType = 'string' | 'number' | 'boolean' | 'select';

export interface ParameterSchema {
  name: string;
  type: ParameterType;
  default?: string | number | boolean;
  required: boolean;
  description: string;
  options?: string[]; // Required when type is 'select'
  min?: number; // For number type
  max?: number; // For number type
}

export interface Task {
  id: string;
  name: string;
  description: string;
  category: TaskCategory;
  version: string;
  parameters: ParameterSchema[];
  resultMetrics: string[];
  estimatedDuration?: number; // in seconds
  sampleCount?: number;
  referenceUrl?: string;
}

// ============================================================================
// Model Types
// ============================================================================

export type ModelStatus = 'ready' | 'pending' | 'failed';

export interface Model {
  id: string;
  name: string;
  version?: string;
  namespace: string;
  runtime: string;
  endpoint: string;
  status: ModelStatus;
  createdAt: string;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

export interface ModelFilters {
  namespace?: string;
  runtime?: string;
  status?: ModelStatus;
}

// ============================================================================
// API Error Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthStatus {
  status: 'healthy';
  timestamp: string;
}

export interface ReadinessStatus {
  status: 'ready';
  dependencies: {
    backendService: boolean;
    modelRegistry: boolean;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Generic API response wrapper for async operations
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  loading: boolean;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an evaluation is running
 */
export const isEvaluationRunning = (evaluation: Evaluation): boolean => {
  return evaluation.status === 'running';
};

/**
 * Type guard to check if an evaluation is completed
 */
export const isEvaluationCompleted = (evaluation: Evaluation): boolean => {
  return evaluation.status === 'completed';
};

/**
 * Type guard to check if an evaluation has failed
 */
export const isEvaluationFailed = (evaluation: Evaluation): boolean => {
  return evaluation.status === 'failed';
};

/**
 * Type guard to check if an evaluation can be cancelled
 */
export const canCancelEvaluation = (evaluation: Evaluation): boolean => {
  return evaluation.status === 'pending' || evaluation.status === 'running';
};

/**
 * Type guard to check if results are available for an evaluation
 */
export const hasResults = (evaluation: Evaluation): boolean => {
  return evaluation.status === 'completed' && evaluation.resultsSummary !== undefined;
};

/**
 * Type guard to check if a model is ready for evaluation
 */
export const isModelReady = (model: Model): boolean => {
  return model.status === 'ready';
};

// ============================================================================
// Constants
// ============================================================================

/**
 * Evaluation status display labels
 */
export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

/**
 * Evaluation status colors for UI (PatternFly status variants)
 */
export const EVALUATION_STATUS_COLORS: Record<EvaluationStatus, string> = {
  pending: 'info',
  running: 'progress',
  completed: 'success',
  failed: 'danger',
  cancelled: 'warning',
};

/**
 * Task category display labels
 */
export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  reasoning: 'Reasoning',
  knowledge: 'Knowledge',
  comprehension: 'Comprehension',
  generation: 'Generation',
  truthfulness: 'Truthfulness',
  safety: 'Safety',
  multilingual: 'Multilingual',
};

/**
 * Model status display labels
 */
export const MODEL_STATUS_LABELS: Record<ModelStatus, string> = {
  ready: 'Ready',
  pending: 'Pending',
  failed: 'Failed',
};

/**
 * Default pagination settings
 */
export const DEFAULT_PAGINATION = {
  limit: 20,
  offset: 0,
} as const;

/**
 * Default polling interval for running evaluations (milliseconds)
 */
export const DEFAULT_POLLING_INTERVAL = 5000; // 5 seconds

/**
 * Maximum polling interval (milliseconds)
 */
export const MAX_POLLING_INTERVAL = 30000; // 30 seconds

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate evaluation name length
 */
export const isValidEvaluationName = (name: string): boolean => {
  return name.length > 0 && name.length <= 100;
};

/**
 * Validate template name length
 */
export const isValidTemplateName = (name: string): boolean => {
  return name.length > 0 && name.length <= 100;
};

/**
 * Validate that at least one task is selected
 */
export const hasValidTasks = (tasks: string[]): boolean => {
  return tasks.length > 0;
};

/**
 * Validate progress percentage
 */
export const isValidProgress = (progress: number): boolean => {
  return progress >= 0 && progress <= 100;
};

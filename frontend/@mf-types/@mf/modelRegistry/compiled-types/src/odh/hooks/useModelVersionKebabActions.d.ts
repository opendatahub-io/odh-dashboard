import type { IAction } from '@patternfly/react-table';
import type { ModelVersion, RegisteredModel } from '~/app/types';
export declare const useModelVersionKebabActions: (mv: ModelVersion, registeredModel?: RegisteredModel, onActionComplete?: () => void) => IAction[];

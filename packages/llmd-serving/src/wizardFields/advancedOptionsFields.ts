import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type {
  ExternalRouteField,
  TokenAuthField,
  FieldExtensionContext,
} from '@odh-dashboard/model-serving/types/form-data';
import { LLMD_SERVING_ID } from '../../extensions/extensions';

export const externalRouteField: ExternalRouteField = {
  id: 'externalRoute',
  type: 'modifier',
  isVisible: false, // Hide external route for LLMD deployments
  isActive: (context: FieldExtensionContext): boolean => {
    return (
      context.modelType === ServingRuntimeModelType.GENERATIVE &&
      context.selectedModelServer?.name === LLMD_SERVING_ID
    );
  },
};

export const tokenAuthField: TokenAuthField = {
  id: 'tokenAuth',
  type: 'modifier',
  initialValue: true, // Default to checked for LLMD deployments
  isActive: (context: FieldExtensionContext): boolean => {
    return (
      context.modelType === ServingRuntimeModelType.GENERATIVE &&
      context.selectedModelServer?.name === LLMD_SERVING_ID
    );
  },
};

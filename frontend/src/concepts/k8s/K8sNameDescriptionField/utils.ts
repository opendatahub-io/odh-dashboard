import * as _ from 'lodash-es';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
  isK8sDSGResource,
  isValidK8sName,
  translateDisplayNameForK8s,
} from '~/concepts/k8s/utils';
import { RecursivePartial } from '~/typeHelpers';
import {
  K8sNameDescriptionFieldData,
  K8sNameDescriptionFieldUpdateFunctionInternal,
  K8sNameDescriptionType,
  UseK8sNameDescriptionDataConfiguration,
} from './types';

/**
 * Those used in OpenShift Routes need to be less than 63 between namespace & resource name.
 * 30 because UX feels this is an easier number to understand than 31 or 32.
 * Arguably we could dynamically figure this out, but as of right now splitting equally is the UX.
 */
const ROUTE_BASED_NAME_LENGTH = 30;
/**
 * These are resources that need to be limited
 * TODO: Support more than just ROUTE_BASED_NAME_LENGTH
 */
export enum LimitNameResourceType {
  /** Project names take up half of all in-project route lengths */
  PROJECT,
  /** Workbenches create routes */
  WORKBENCH,
  // TODO: Support Model Serving?
}
/** K8s max DNS subdomain name length */
const MAX_RESOURCE_NAME_LENGTH = 253;

export const isK8sNameDescriptionType = (
  x?: K8sNameDescriptionType | K8sResourceCommon,
): x is K8sNameDescriptionType => !!x && 'k8sName' in x;

export const setupDefaults = ({
  initialData,
  limitNameResourceType,
  safePrefix,
  staticPrefix,
}: UseK8sNameDescriptionDataConfiguration): K8sNameDescriptionFieldData => {
  let initialName = '';
  let initialDescription = '';
  let initialK8sNameValue = '';
  let configuredMaxLength = MAX_RESOURCE_NAME_LENGTH;

  if (isK8sNameDescriptionType(initialData)) {
    initialName = initialData.name || '';
    initialDescription = initialData.description || '';
    initialK8sNameValue = initialData.k8sName || '';
  } else if (isK8sDSGResource(initialData)) {
    initialName = getDisplayNameFromK8sResource(initialData);
    initialDescription = getDescriptionFromK8sResource(initialData);
    initialK8sNameValue = initialData.metadata.name;
  }

  if (limitNameResourceType != null) {
    configuredMaxLength = ROUTE_BASED_NAME_LENGTH;
  }

  return handleUpdateLogic({
    name: initialName,
    description: initialDescription,
    k8sName: {
      value: initialK8sNameValue,
      state: {
        immutable: initialK8sNameValue !== '',
        invalidCharacters: false,
        invalidLength: false,
        maxLength: configuredMaxLength,
        safePrefix,
        staticPrefix,
        touched: false,
      },
    },
  })('name', initialName) satisfies K8sNameDescriptionFieldData;
};

export const handleUpdateLogic =
  (existingData: K8sNameDescriptionFieldData): K8sNameDescriptionFieldUpdateFunctionInternal =>
  (key, value) => {
    const changedData: RecursivePartial<K8sNameDescriptionFieldData> = {};

    // Handle special cases
    switch (key) {
      case 'name': {
        changedData.name = value;

        const { touched, immutable, maxLength, safePrefix, staticPrefix } =
          existingData.k8sName.state;
        // When name changes, we want to update resource name if applicable
        if (!touched && !immutable) {
          // Update the generated name
          const k8sValue = translateDisplayNameForK8s(value, {
            maxLength,
            safeK8sPrefix: safePrefix,
            staticPrefix,
          });
          changedData.k8sName = {
            value: k8sValue,
          };
        }
        break;
      }
      case 'k8sName':
        changedData.k8sName = {
          state: {
            invalidCharacters: value.length > 0 ? !isValidK8sName(value) : false,
            invalidLength: value.length > existingData.k8sName.state.maxLength,
            touched: true,
          },
          value,
        };
        break;
      default:
        // Do nothing special
        changedData[key] = value;
    }

    return _.merge({}, existingData, changedData);
  };

export const isK8sNameDescriptionDataValid = ({
  name,
  k8sName: {
    value,
    state: { invalidCharacters, invalidLength },
  },
}: K8sNameDescriptionFieldData): boolean =>
  name.trim().length > 0 && isValidK8sName(value) && !invalidLength && !invalidCharacters;

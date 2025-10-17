import { Patch } from '@openshift/dynamic-plugin-sdk-utils';
import * as _ from 'lodash-es';
import { Toleration } from '#~/types';
import { AcceleratorProfileState } from './useReadAcceleratorState';
import { AcceleratorProfileFormData } from './useAcceleratorProfileFormState';

export type TolerationChanges = {
  type: 'add' | 'remove' | 'replace' | 'nothing';
  settings: Toleration[];
};

export const determineTolerations = (
  initialAcceleratorProfile?: AcceleratorProfileState,
  selectedAcceleratorProfile?: AcceleratorProfileFormData,
  existingTolerations?: Toleration[],
): Toleration[] => {
  let tolerations = existingTolerations || [];

  // remove old accelerator tolerations if they exist
  if (initialAcceleratorProfile?.acceleratorProfile) {
    tolerations = tolerations.filter(
      (t) =>
        !initialAcceleratorProfile.acceleratorProfile?.spec.tolerations?.some((t2) =>
          _.isEqual(t2, t),
        ),
    );
  }

  // add new accelerator tolerations if they exist
  if (selectedAcceleratorProfile?.profile?.spec.tolerations) {
    tolerations.push(...selectedAcceleratorProfile.profile.spec.tolerations);
  }

  // remove duplicated tolerations
  tolerations = _.uniqWith(tolerations, _.isEqual);
  return tolerations;
};

export const getTolerationPatch = (tolerationChanges: TolerationChanges): Patch | null => {
  const tolerationPath = '/spec/template/spec/tolerations';
  switch (tolerationChanges.type) {
    case 'remove':
      return {
        op: tolerationChanges.type,
        path: tolerationPath,
      };
    case 'replace':
    case 'add':
      return {
        op: tolerationChanges.type,
        path: tolerationPath,
        value: tolerationChanges.settings,
      };
    case 'nothing':
    default:
      return null;
  }
};

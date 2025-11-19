import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import { AcceleratorProfileModel } from '#~/api/models';

/**
 *   only in deprecation paths
 *  used by *both* modelmesh and finetuning:
 * fine-tuning: useIlabPodSpecOptionsState
 * modelmesh: useServingAcceleratorProfileFormState
 *
 * remove this when they are *both* gone
 *
 */
export const listAcceleratorProfiles = async (
  namespace: string,
): Promise<AcceleratorProfileKind[]> =>
  k8sListResource<AcceleratorProfileKind>({
    model: AcceleratorProfileModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);

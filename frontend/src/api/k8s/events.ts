import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { EventKind } from '~/k8sTypes';
import { EventModel } from '~/api/models';

export const getNotebookEvents = async (namespace: string, podUid: string): Promise<EventKind[]> =>
  k8sListResource<EventKind>({
    model: EventModel,
    queryOptions: {
      ns: namespace,
      queryParams: {
        fieldSelector: `involvedObject.kind=Pod,involvedObject.uid=${podUid}`,
      },
    },
  }).then(
    // Filter the events by pods that have the same name as the notebook
    (r) => r.items,
  );

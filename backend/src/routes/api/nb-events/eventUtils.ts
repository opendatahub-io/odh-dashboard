import { V1EventList } from '@kubernetes/client-node';
import { EventStatus, KubeFastifyInstance, NotebookStatus } from '../../../types';
import createError from 'http-errors';

export const getNotebookEvents = async (
  fastify: KubeFastifyInstance,
  nbName: string,
): Promise<NotebookStatus> => {
  const response = await fastify.kube.coreV1Api
    .listNamespacedEvent(
      fastify.kube.namespace,
      undefined,
      undefined,
      undefined,
      `involvedObject.kind=Notebook,involvedObject.name=${nbName}`,
    )
    .then((res) => {
      return res.body as V1EventList;
    });
  let percentile = 0;
  let status: EventStatus = EventStatus.IN_PROGRESS;
  let lastItem;
  try {
    lastItem = response.items[response.items.length - 1];
    if (lastItem.message.includes('oauth-proxy')) {
      switch (lastItem.reason) {
        case 'Pulling': {
          percentile = 72;
          break;
        }
        case 'Pulled': {
          percentile = 81;
          break;
        }
        case 'Created': {
          percentile = 90;
          break;
        }
        case 'Started': {
          percentile = 100;
          status = EventStatus.SUCCESS;
          break;
        }
      }
    } else {
      switch (lastItem.reason) {
        case 'SuccessfulCreate': {
          percentile = 9;
          break;
        }
        case 'Scheduled': {
          percentile = 18;
          break;
        }
        case 'AddedInterface': {
          percentile = 27;
          break;
        }
        case 'Pulling': {
          percentile = 36;
          break;
        }
        case 'Pulled': {
          percentile = 45;
          break;
        }
        case 'Created': {
          percentile = 54;
          break;
        }
        case 'Started': {
          percentile = 63;
          break;
        }
        default: {
          status = EventStatus.ERROR;
        }
      }
    }
  } catch (e) {
    const error = createError(404, 'failed to get event items');
    throw error;
  }

  const statusObject: NotebookStatus = {
    percentile: percentile,
    currentStatus: status,
    currentEvent: lastItem.reason,
    currentEventDescription: lastItem.message,
    events: response.items,
  };
  return statusObject;
};

import {
  MachineAutoscalerList,
  GPUInfo,
  KubeFastifyInstance,
  PrometheusResponse,
  MachineSet,
  gpuScale,
} from '../../../types';
import { V1PodList } from '@kubernetes/client-node';
import https from 'https';

/** Storage to prevent heavy calls from being performed for EVERY user */
const storage: { lastFetch: number; lastValue: GPUInfo } = {
  lastValue: { available: 0, configured: false, autoscalers: [] },
  lastFetch: 0,
};

const CACHE_DELAY = 30_000;

export const getGPUNumber = async (fastify: KubeFastifyInstance): Promise<GPUInfo> => {
  if (storage.lastFetch >= Date.now() - CACHE_DELAY) {
    fastify.log.info(`Returning cached gpu value (${JSON.stringify(storage)})`);
    return storage.lastValue;
  }
  fastify.log.info(`Computing GPU state`);
  let maxGpuNumber = 0;
  let areGpusConfigured = false;
  const gpuPodList = await fastify.kube.coreV1Api
    .listPodForAllNamespaces(undefined, undefined, undefined, 'app=nvidia-dcgm-exporter')
    .then((res) => {
      return res.body as V1PodList;
    })
    .catch((e) => {
      fastify.log.error(`Exception when calling DCGM exporter pods: ${e}`);
      return { items: [] } as V1PodList;
    });
  const scalingLimit = await getGPUScaling(fastify);
  if (gpuPodList.items.length != 0) {
    areGpusConfigured = true;
    const gpuDataResponses = [];
    for (let i = 0; i < gpuPodList.items.length; i++) {
      if (fastify.kube.saToken) {
        gpuDataResponses.push(getGPUData(gpuPodList.items[i].status.podIP, fastify.kube.saToken));
      }
    }

    await Promise.all(gpuDataResponses).then((gpuDataList) => {
      for (let i = 0; i < gpuDataList.length; i++) {
        if (gpuDataList[i].code === 200) {
          const gpuNumber = gpuDataList[i].response;
          if (gpuNumber > maxGpuNumber) {
            maxGpuNumber = gpuNumber;
          }
        } else {
          fastify.log.warn(`Error getting GPUData ${gpuDataList[i].response}`);
        }
      }
    });
  } else if (scalingLimit.length != 0) {
    areGpusConfigured = true;
  }

  const data: GPUInfo = {
    configured: areGpusConfigured,
    available: maxGpuNumber,
    autoscalers: scalingLimit,
  };
  storage.lastFetch = Date.now();
  storage.lastValue = data;
  return data;
};

export const getGPUData = async (
  podIP: string,
  token: string,
): Promise<{ code: number; response: number | any }> => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'thanos-querier.openshift-monitoring.svc.cluster.local',
      port: 9091,
      path: `/api/v1/query?query=count+(count+by+(UUID,GPU_I_ID)(DCGM_FI_PROF_GR_ENGINE_ACTIVE{instance="${podIP}:9400"})+or+vector(0))-count+(count+by+(UUID,GPU_I_ID)(DCGM_FI_PROF_GR_ENGINE_ACTIVE{instance="${podIP}:9400",exported_pod=~".%2b"})+or+vector(0))`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      protocol: 'https:',
      rejectUnauthorized: false,
    };
    const httpsRequest = https
      .get(options, (res) => {
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk: any) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsedData: PrometheusResponse = JSON.parse(rawData);
            resolve({ code: 200, response: Number(parsedData['data']['result'][0]['value'][1]) });
          } catch (e) {
            reject({ code: 500, response: rawData });
          }
        });
      })
      .on('error', () => {
        reject({ code: 500, response: 'Cannot fetch GPU data' });
      });
    httpsRequest.end();
  });
};

const getGPUScaling = async (fastify: KubeFastifyInstance): Promise<gpuScale[]> => {
  const scalingList: gpuScale[] = [];
  const autoscalerList = (
    await fastify.kube.customObjectsApi.listNamespacedCustomObject(
      'autoscaling.openshift.io',
      'v1beta1',
      'openshift-machine-api',
      'machineautoscalers',
    )
  ).body as MachineAutoscalerList;

  const machineSets = [];
  for (let i = 0; i < autoscalerList.items.length; i++) {
    const machineSetName = autoscalerList.items[i].spec.scaleTargetRef.name; //also gives info about kind and apiversion if needed in the future
    machineSets.push(
      fastify.kube.customObjectsApi
        .getNamespacedCustomObject(
          'machine.openshift.io',
          'v1beta1',
          'openshift-machine-api',
          'machinesets',
          machineSetName,
        )
        .catch((e) => {
          fastify.log.warn(
            `Autoscaler ${autoscalerList.items[i].metadata.name} did not contain MachineSet info. ${e.response.data.message}`,
          );
          return null;
        }),
    );
  }
  await Promise.all(machineSets).then((msList) => {
    for (let i = 0; i < msList.length; i++) {
      const machineSet = msList[i].body as MachineSet;
      const gpuAmount = Number(machineSet?.metadata.annotations?.['machine.openshift.io/GPU']);
      if (gpuAmount > 0) {
        scalingList.push({
          availableScale:
            autoscalerList.items[i].spec.maxReplicas - (machineSet.status.availableReplicas || 0),
          gpuNumber: gpuAmount,
        });
      }
    }
  });
  return scalingList;
};

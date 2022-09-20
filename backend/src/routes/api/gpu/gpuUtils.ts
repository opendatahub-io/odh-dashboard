import {
  ClusterAutoscalerList,
  GPUInfo,
  KubeFastifyInstance,
  PrometheusResponse,
} from '../../../types';
import { V1PodList } from '@kubernetes/client-node';
import https from 'https';
import * as fs from 'fs';

export const getGPUNumber = async (fastify: KubeFastifyInstance): Promise<GPUInfo> => {
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
  if (gpuPodList.items.length != 0) {
    areGpusConfigured = true;
    const token = await new Promise<string>((resolve, reject) => {
      fs.readFile('/var/run/secrets/kubernetes.io/serviceaccount/token', (err, data) => {
        try {
          resolve(String(data));
        } catch {
          reject('');
          fastify.log.error(err);
        }
      });
    });
    for (let i = 0; i < gpuPodList.items.length; i++) {
      const data = await getGPUData(gpuPodList.items[i].status.podIP, token);
      if (data.code === 200) {
        const gpuNumber = data.response;
        if (gpuNumber > maxGpuNumber) {
          maxGpuNumber = gpuNumber;
        }
      } else {
        fastify.log.warn(`Error getting GPUData ${data.response}`);
      }
    }
  }
  const scalingLimit = await getGPUScaling(fastify);
  return { configured: areGpusConfigured, available: maxGpuNumber, scaleMax: scalingLimit };
};

export const getGPUData = async (
  podIP: string,
  token: string,
): Promise<{ code: number; response: number | any }> => {
  return await new Promise((resolve, reject) => {
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

const getGPUScaling = async (fastify: KubeFastifyInstance): Promise<number> => {
  const autoscalers = await fastify.kube.customObjectsApi
    .listClusterCustomObject('autoscaling.openshift.io', 'v1', 'clusterautoscalers')
    .then((res) => {
      return res.body as ClusterAutoscalerList;
    });
  let scaleLimit = 0;
  for (let i = 0; i < autoscalers.items.length; i++) {
    const gpuLimits = autoscalers.items[i].spec.resourceLimits.gpus;
    gpuLimits.forEach((limit) => {
      if (limit.type === 'nvidia.com/gpu') {
        if (scaleLimit < limit.max) {
          scaleLimit = limit.max;
        }
      }
    });
  }
  return scaleLimit;
};

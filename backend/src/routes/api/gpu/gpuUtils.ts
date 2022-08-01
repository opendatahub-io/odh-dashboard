import { KubeFastifyInstance, PrometheusResponse } from '../../../types';
import { V1PodList, V1Secret, V1ServiceAccount } from '@kubernetes/client-node';
import https from 'https';

export const getGPUNumber = async (fastify: KubeFastifyInstance): Promise<number> => {
  let maxGpuNumber = 0;
  const gpuPodList = await fastify.kube.coreV1Api
    .listNamespacedPod(
      fastify.kube.namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      'app=nvidia-dcgm-exporter',
    )
    .then((res) => {
      return res.body as V1PodList;
    })
    .catch((e) => {
      fastify.log.error(`Exception when calling DCGM exporter pods: ${e}`);
      return { items: [] } as V1PodList;
    });
  if (gpuPodList.items.length != 0) {
    const dashboardSA = await fastify.kube.coreV1Api
      .readNamespacedServiceAccount('odh-dashboard', fastify.kube.namespace)
      .then((res) => res.body as V1ServiceAccount);
    let dashboardTokenName = '';
    for (let i = 0; i < dashboardSA.secrets.length; i++) {
      if (dashboardSA.secrets[i].name.includes('token')) {
        dashboardTokenName = dashboardSA.secrets[i].name;
      }
    }
    const dashboardSASecret = await fastify.kube.coreV1Api
      .readNamespacedSecret(dashboardTokenName, fastify.kube.namespace)
      .then((res) => res.body as V1Secret);
    const promToken = decodeB64(dashboardSASecret.data.token);
    for (let i = 0; i < gpuPodList.items.length; i++) {
      const data = await getGPUData(gpuPodList.items[i].status.podIP, promToken);
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
  return maxGpuNumber;
};

export const getGPUData = async (
  podIP: string,
  token: string,
): Promise<{ code: number; response: number | any }> => {
  return await new Promise((resolve, reject) => {
    const options = {
      hostname: 'thanos-querier.openshift-monitoring.svc.cluster.local',
      port: 9091,
      path: `/api/v1/query?query=count+(count+by+(UUID,GPU_I_ID)(DCGM_FI_PROF_GR_ENGINE_ACTIVE{instance="${podIP}:9400"})+or+vector(0))+-+count+(count+by+(UUID,GPU_I_ID)(DCGM_FI_PROF_GR_ENGINE_ACTIVE{instance="${podIP}:9400",exported_pod=~".+"})+or+vector(0))`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      protocol: 'https:',
      rejectUnauthorized: false,
    };
    const httpsRequest = https.get(options, (res) => {
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
    });
    httpsRequest.end();
  });
};

const decodeB64 = (str: string): string => Buffer.from(str, 'base64').toString('binary');

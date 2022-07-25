import { KubeFastifyInstance } from '../../../types';
import { V1PodList, V1Secret, V1Service, V1ServiceAccount } from '@kubernetes/client-node';
import https from 'https';
import http from 'http';
import gpu from '.';

export const getGPUNumber = async (fastify: KubeFastifyInstance): Promise<any> => {
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
      fastify.log.error(`Exception when claling DCGM exporter pods: ${e}`);
      return { items: [] } as V1PodList;
    });
  if (gpuPodList.items.length != 0) {
    const promService = await fastify.kube.coreV1Api
      .readNamespacedService('prometheus-k8s', 'openshift-monitoring')
      .then((res: { response: http.IncomingMessage; body: V1Service }) => res.body as V1Service);
    let promPort = '';
    for (let i = 0; i < promService.spec.ports.length; i++) {
      if (promService.spec.ports[i].name == 'web') {
        promPort = promService.spec.ports[i].port.toString();
      }
    }
    const promSA = await fastify.kube.coreV1Api
      .readNamespacedServiceAccount('prometheus-k8s', 'openshift-monitoring')
      .then((res) => res.body as V1ServiceAccount);
    let promTokenName = '';
    for (let i = 0; i < promSA.secrets.length; i++) {
      if (promSA.secrets[i].name.includes('token')) {
        promTokenName = promSA.secrets[i].name;
      }
    }
    const promSecret = await fastify.kube.coreV1Api
      .readNamespacedSecret(promTokenName, 'openshift-monitoring')
      .then((res) => res.body as V1Secret);
    const promToken = decodeB64(promSecret.data.token);
    for (let i = 0; i < gpuPodList.items.length; i++) {
      const podIP = gpuPodList.items[i].status.podIP;
      const options = {
        hostname: 'thanos-querier.openshift-monitoring.svc.cluster.local',
        port: 9091,
        path: `/api/v1/query?query=DCGM_FI_PROF_GR_ENGINE_ACTIVE`,
        headers: {
          Authorization: `Bearer ${promToken}`,
        },
        protocol: 'https:',
      };
      //const fullURL = "https://thanos-querier.openshift-monitoring.svc.cluster.local:9091/api/v1/query?query=DCGM_FI_PROF_GR_ENGINE_ACTIVE"
      let gpuNumberData: any = null;
      const callback = function (res: any) {
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk: any) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData);
            gpuNumberData = parsedData;
          } catch (e) {
            console.error(e.message);
          }
        });
      };

      https.get(options, callback).end();
      maxGpuNumber = gpuNumberData;
      //const gpuNumber = gpuNumberData[0]['value'][1];
      //if (gpuNumber > maxGpuNumber) {
      //  maxGpuNumber = gpuNumber;
      //}
    }
  }
  return maxGpuNumber;
};

const decodeB64 = (str: string): string => Buffer.from(str, 'base64').toString('binary');

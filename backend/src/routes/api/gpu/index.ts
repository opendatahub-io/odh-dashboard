const prometheus = require('prom-client')
import { V1Pod, V1PodList } from "@kubernetes/client-node";
import { FastifyRequest, FastifyReply } from "fastify";
import { KubeFastifyInstance } from "../../../types";

export default async (fastify: KubeFastifyInstance): Promise<void> => {
    fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        const gpuPodList = await fastify.kube.coreV1Api
        .listNamespacedPod(
            fastify.kube.namespace,
            undefined,
            undefined,
            undefined,
            undefined,
            "app=nvidia-dcgm-exporter",
        )
        .then ((res) => {
            return res.body as V1PodList
        })
        .catch ((e) => {
            fastify.log.error(`Exception when claling DCGM exporter pods: ${e}`)
            return {items: []} as V1PodList
        });
        if (gpuPodList.items.length != 0) {
            prometheus
        }
      });
    
};
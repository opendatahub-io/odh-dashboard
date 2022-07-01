const prometheus = require('prom-client')


import { FastifyRequest, FastifyReply } from "fastify";
import { KubeFastifyInstance } from "../../../types";
import { getGPUNumber } from "./gpuUtils";

export default async (fastify: KubeFastifyInstance): Promise<void> => {
    fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
        return getGPUNumber(fastify)
      });
};
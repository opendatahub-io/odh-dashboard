import { KubeFastifyInstance} from "../../../types"
import { V1Secret } from "@kubernetes/client-node";

export const getSecret = (fastify: KubeFastifyInstance, name: string): Promise<V1Secret> => {
    const coreV1Api = fastify.kube.coreV1Api;
    const secretResponse = coreV1Api
    .readNamespacedSecret(
        name,
        fastify.kube.namespace,
    )
    .then((res) => {
        return res.body
    })
    .catch((e) => {
        fastify.log.error(`Could not read secret ${name}, ${e}`)
        return {}
    })
    return secretResponse
    
}

export const postSecret = (fastify: KubeFastifyInstance, body: V1Secret): void => {
    fastify.kube.coreV1Api.createNamespacedSecret(
        fastify.kube.namespace,
        body
    )
}
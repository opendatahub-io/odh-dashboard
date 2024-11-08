import { FastifyReply, FastifyRequest } from 'fastify';
import { secureRoute } from '../../../../utils/route-security';
import { KubeFastifyInstance, NIMAccountKind, SecretKind } from '../../../../types';
import { logRequestDetails } from '../../../../utils/fileUtils';
import { isString } from 'lodash';

module.exports = async (fastify: KubeFastifyInstance) => {
    const { namespace } = fastify.kube;
    const NIM_SECRET_NAME = 'nvidia-nim-access-new';
    const NIM_ACCOUNT_NAME = 'odh-nim-account-new';
    const PAGE_NOT_FOUND_MESSAGE = '404 page not found';

    fastify.get(
        '/',
        secureRoute(fastify)(
            async (
                request: FastifyRequest,
                reply: FastifyReply,
            ) => {
                logRequestDetails(fastify, request);
                try {
                    const response = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
                        'nim.opendatahub.io',
                        'v1',
                        namespace,
                        'accounts',
                        NIM_ACCOUNT_NAME,
                    );
                    return response.body;
                } catch (e) {
                    if (e.response?.statusCode === 404) {
                        // 404 error means the Account CRD does not exist, so cannot create CR based on it.
                        if (isString(e.response.body) && e.response.body.trim() === PAGE_NOT_FOUND_MESSAGE.trim()) {
                            fastify.log.error(`Failed to find NIM account, ${e.response?.body || e.message}`);
                            reply.status(404).send(`Failed to find NIM account, ${e.response?.body || e.message}`);
                        } else {
                            fastify.log.error(`NIM account does not exist, ${e.response.body.message}`);
                            reply.send(new Error(`NIM account does not exist, ${e.response.body.message}`));
                        }
                    }
                }
            },
        ),
    )

    fastify.post(
        '/',
        secureRoute(fastify)(
            async (
                request: FastifyRequest<{
                    Body: { [key: string]: string };
                }>,
                reply: FastifyReply,
            ) => {
                const enableValues = request.body;
                const { coreV1Api, namespace } = fastify.kube;
                const nimSecret: SecretKind = {
                    apiVersion: 'v1',
                    metadata: {
                        name: NIM_SECRET_NAME,
                        namespace,
                        labels: {
                            'opendatahub.io/dashboard': 'true',
                        },
                    },
                    type: 'Opaque',
                    stringData: enableValues
                };

                const nimAccount: NIMAccountKind = {
                    apiVersion: 'nim.opendatahub.io/v1',
                    kind: 'Account',
                    metadata: {
                        name: NIM_ACCOUNT_NAME,
                        namespace,
                    },
                    spec: {
                        apiKeySecret: { name: NIM_SECRET_NAME },
                    },
                };

                try {
                    await coreV1Api.createNamespacedSecret(namespace, nimSecret).then(async () => {
                        fastify.log.info(`Successfully created NIM secret`);

                        try {
                            const response = await fastify.kube.customObjectsApi.createNamespacedCustomObject(
                                'nim.opendatahub.io',
                                'v1',
                                namespace,
                                'accounts',
                                nimAccount,
                                undefined,
                            );
                            return response.body;
                        } catch (e) {
                            fastify.log.error(`NIM account could not be created, ${e.response?.body?.message || e.message}`);
                            reply.status(e.response.statusCode).send(new Error(`NIM account could not be created, ${e.response?.body?.message || e.message}`));
                        }
                    });
                } catch (e) {
                    fastify.log.error(`Failed to create NIM secret, ${e.message}`);
                    reply.status(e.response.statusCode).send(new Error(`Failed to create NIM secret, ${e.response?.body?.message || e.message}`));
                }
            },
        ),
    );
};

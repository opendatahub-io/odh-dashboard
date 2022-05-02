import {
    KubeFastifyInstance,
    Notebook,
    NotebookList,
    Route,
  } from '../../../types';
  import { FastifyReply, FastifyRequest } from 'fastify';
  import { PatchUtils } from '@kubernetes/client-node';

  export default async (fastify: KubeFastifyInstance): Promise<void> => {
    module.exports = async (fastify: KubeFastifyInstance) => {
        fastify.get('/:projectName', async (request: FastifyRequest, reply: FastifyReply) => {
            const params = request.params as {
            projectName: string;
            };
            const query = request.query as {
            labels: string;
            };

            const kubeResponse = await fastify.kube.customObjectsApi.listNamespacedCustomObject(
            'kubeflow.org',
            'v1',
            params.projectName,
            'notebooks',
            undefined,
            undefined,
            undefined,
            query.labels,
            );
            return kubeResponse.body as NotebookList;
        });

        fastify.get(
            '/:projectName/notebooks/:notebookName',
            async (request: FastifyRequest, reply: FastifyReply) => {
            const params = request.params as {
                projectName: string;
                notebookName: string;
            };
            const query = request.query as {
                labels: string;
            };

            const kubeResponse = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
                'kubeflow.org',
                'v1',
                params.projectName,
                'notebooks',
                params.notebookName,
            );
            return kubeResponse.body as Notebook;
            },
        );

        fastify.post('/:projectName/notebooks', async (request: FastifyRequest, reply: FastifyReply) => {
            const params = request.params as {
            projectName: string;
            };
            const query = request.query as {
            labels: string;
            };
            const body = request.body as Notebook;
            const notebookName = body?.metadata?.name;

            const createRouteResponse = await fastify.kube.customObjectsApi.createNamespacedCustomObject(
            'route.openshift.io',
            'v1',
            params.projectName,
            'routes',
            {
                metadata: {
                name: notebookName,
                },
                spec: {
                to: {
                    kind: 'Service',
                    name: notebookName,
                    weight: 100,
                },
                port: {
                    targetPort: `http-${notebookName}`,
                },
                tls: {
                    termination: 'edge',
                    insecureEdgeTerminationPolicy: 'Redirect',
                },
                wildcardPolicy: 'None',
                },
            },
            );

            const route = createRouteResponse.body as Route;

            const notebookData = request.body as Notebook;
            if (!notebookData?.metadata?.annotations) {
            notebookData.metadata.annotations = {};
            }
            notebookData.metadata.annotations['opendatahub.io/link'] = `https://${route.spec.host}`;

            const createNotebookResponse = await fastify.kube.customObjectsApi.createNamespacedCustomObject(
            'kubeflow.org',
            'v1',
            params.projectName,
            'notebooks',
            notebookData,
            );

            return createNotebookResponse.body as Notebook;
        });

        fastify.delete(
            '/:projectName/notebooks/:notebookName',
            async (request: FastifyRequest, reply: FastifyReply) => {
            const params = request.params as {
                projectName: string;
                notebookName: string;
            };

            try {
                await fastify.kube.customObjectsApi.deleteNamespacedCustomObject(
                'route.openshift.io',
                'v1',
                params.projectName,
                'routes',
                params.notebookName,
                );
            } catch (e) {
                if (e.response?.statusCode !== 404) {
                fastify.log.error(
                    `Unable to delete notebook route ${params.notebookName}: ${e.toString()}`,
                );
                }
            }

            return fastify.kube.customObjectsApi.deleteNamespacedCustomObject(
                'kubeflow.org',
                'v1',
                params.projectName,
                'notebooks',
                params.notebookName,
            );
            },
        );

        fastify.patch(
            '/:projectName/notebooks/:notebookName',
            async (request: FastifyRequest, reply: FastifyReply) => {
            const params = request.params as {
                projectName: string;
                notebookName: string;
            };
            const requestBody = request.body as { stopped: boolean } | any;

            let patch;
            const options = {
                headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
            };
            if (requestBody.stopped) {
                const dateStr = new Date().toISOString().replace(/\.\d{3}Z/i, 'Z');
                patch = { metadata: { annotations: { 'kubeflow-resource-stopped': dateStr } } };
            } else if (requestBody.stopped === false) {
                patch = { metadata: { annotations: { 'kubeflow-resource-stopped': null } } };
            } else {
                patch = requestBody;
            }

            const kubeResponse = await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
                'kubeflow.org',
                'v1',
                params.projectName,
                'notebooks',
                params.notebookName,
                patch,
                undefined,
                undefined,
                undefined,
                options,
            );
            return kubeResponse.body as Notebook;
            },
        );
    };
};

import type { FastifyInstance, FastifyRegisterOptions } from 'fastify';

import kubePlugin from './plugins/kube';

import rootRoute from './routes/root';
import moduleFederationRoute from './routes/module-federation';

import apiNotFoundRoute from './routes/api/not-found';
import buildsRoute from './routes/api/builds/index';
import clusterSettingsRoute from './routes/api/cluster-settings/index';
import componentsRoute from './routes/api/components/index';
import configRoute from './routes/api/config/index';
import connectionTypesRoute from './routes/api/connection-types/index';
import consoleLinksRoute from './routes/api/console-links/index';
import dashboardConfigRoute from './routes/api/dashboardConfig/index';
import devImpersonateRoute from './routes/api/dev-impersonate/index';
import docsRoute from './routes/api/docs/index';
import dscRoute from './routes/api/dsc/index';
import dsciRoute from './routes/api/dsci/index';
import envsRoute from './routes/api/envs/index';
import featurestoresRoute from './routes/api/featurestores/index';
import healthRoute from './routes/api/health/index';
import integrationsNimRoute from './routes/api/integrations/nim/index';
import k8sRoute from './routes/api/k8s/index';
import modelRegistriesRoute from './routes/api/modelRegistries/index';
import modelRegistryCertificatesRoute from './routes/api/modelRegistryCertificates/index';
import modelRegistryRoleBindingsRoute from './routes/api/modelRegistryRoleBindings/index';
import namespacesRoute from './routes/api/namespaces/index';
import nimServingRoute from './routes/api/nim-serving/index';
import notebooksRoute from './routes/api/notebooks/index';
import operatorSubscriptionStatusRoute from './routes/api/operator-subscription-status/index';
import prometheusRoute from './routes/api/prometheus/index';
import quickstartsRoute from './routes/api/quickstarts/index';
import rayJobLogsRoute from './routes/api/ray-job-logs/index';
import rolebindingsRoute from './routes/api/rolebindings/index';
import routeRoute from './routes/api/route/index';
import segmentKeyRoute from './routes/api/segment-key/index';
import serviceMlmdRoute from './routes/api/service/mlmd/index';
import serviceModelServingRoute from './routes/api/service/model-serving/index';
import serviceModelregistryRoute from './routes/api/service/modelregistry/index';
import servicePipelinesRoute from './routes/api/service/pipelines/index';
import serviceTrustyaiRoute from './routes/api/service/trustyai/index';
import servingRuntimesRoute from './routes/api/servingRuntimes/index';
import statusRoute from './routes/api/status/index';
import templatesRoute from './routes/api/templates/index';
import validateIsvRoute from './routes/api/validate-isv/index';

import wssK8sRoute from './routes/wss/k8s/index';

export async function registerPlugins(
  fastify: FastifyInstance,
  opts: FastifyRegisterOptions<unknown>,
): Promise<void> {
  fastify.register(kubePlugin, opts);
}

export async function registerRoutes(
  fastify: FastifyInstance,
  opts: FastifyRegisterOptions<unknown>,
): Promise<void> {
  fastify.register(rootRoute, opts);
  fastify.register(moduleFederationRoute, opts);

  fastify.register(buildsRoute, { ...opts, prefix: '/api/builds' });
  fastify.register(clusterSettingsRoute, { ...opts, prefix: '/api/cluster-settings' });
  fastify.register(componentsRoute, { ...opts, prefix: '/api/components' });
  fastify.register(configRoute, { ...opts, prefix: '/api/config' });
  fastify.register(connectionTypesRoute, { ...opts, prefix: '/api/connection-types' });
  fastify.register(consoleLinksRoute, { ...opts, prefix: '/api/console-links' });
  fastify.register(dashboardConfigRoute, { ...opts, prefix: '/api/dashboardConfig' });
  fastify.register(devImpersonateRoute, { ...opts, prefix: '/api/dev-impersonate' });
  fastify.register(docsRoute, { ...opts, prefix: '/api/docs' });
  fastify.register(dscRoute, { ...opts, prefix: '/api/dsc' });
  fastify.register(dsciRoute, { ...opts, prefix: '/api/dsci' });
  fastify.register(envsRoute, { ...opts, prefix: '/api/envs' });
  fastify.register(featurestoresRoute, { ...opts, prefix: '/api/featurestores' });
  fastify.register(healthRoute, { ...opts, prefix: '/api/health' });
  fastify.register(integrationsNimRoute, { ...opts, prefix: '/api/integrations/nim' });
  fastify.register(k8sRoute, { ...opts, prefix: '/api/k8s' });
  fastify.register(modelRegistriesRoute, { ...opts, prefix: '/api/modelRegistries' });
  fastify.register(modelRegistryCertificatesRoute, {
    ...opts,
    prefix: '/api/modelRegistryCertificates',
  });
  fastify.register(modelRegistryRoleBindingsRoute, {
    ...opts,
    prefix: '/api/modelRegistryRoleBindings',
  });
  fastify.register(namespacesRoute, { ...opts, prefix: '/api/namespaces' });
  fastify.register(nimServingRoute, { ...opts, prefix: '/api/nim-serving' });
  fastify.register(notebooksRoute, { ...opts, prefix: '/api/notebooks' });
  fastify.register(operatorSubscriptionStatusRoute, {
    ...opts,
    prefix: '/api/operator-subscription-status',
  });
  fastify.register(prometheusRoute, { ...opts, prefix: '/api/prometheus' });
  fastify.register(quickstartsRoute, { ...opts, prefix: '/api/quickstarts' });
  fastify.register(rayJobLogsRoute, { ...opts, prefix: '/api/ray-job-logs' });
  fastify.register(rolebindingsRoute, { ...opts, prefix: '/api/rolebindings' });
  fastify.register(routeRoute, { ...opts, prefix: '/api/route' });
  fastify.register(segmentKeyRoute, { ...opts, prefix: '/api/segment-key' });
  fastify.register(serviceMlmdRoute, { ...opts, prefix: '/api/service/mlmd' });
  fastify.register(serviceModelServingRoute, { ...opts, prefix: '/api/service/model-serving' });
  fastify.register(serviceModelregistryRoute, { ...opts, prefix: '/api/service/modelregistry' });
  fastify.register(servicePipelinesRoute, { ...opts, prefix: '/api/service/pipelines' });
  fastify.register(serviceTrustyaiRoute, { ...opts, prefix: '/api/service/trustyai' });
  fastify.register(servingRuntimesRoute, { ...opts, prefix: '/api/servingRuntimes' });
  fastify.register(statusRoute, { ...opts, prefix: '/api/status' });
  fastify.register(templatesRoute, { ...opts, prefix: '/api/templates' });
  fastify.register(validateIsvRoute, { ...opts, prefix: '/api/validate-isv' });

  fastify.register(apiNotFoundRoute, { ...opts, prefix: '/api' });

  fastify.register(wssK8sRoute, { ...opts, prefix: '/wss/k8s' });
}

import type { K8sResourceListResult } from '@openshift/dynamic-plugin-sdk-utils';
import type { GenericStaticResponse, RouteHandlerController } from 'cypress/types/net-stubbing';
import type { BaseMetricCreationResponse, BaseMetricListResponse } from '~/api';
import type {
  ModelArtifact,
  ModelArtifactList,
  ModelVersion,
  ModelVersionList,
  RegisteredModel,
  RegisteredModelList,
} from '~/concepts/modelRegistry/types';
import type {
  DashboardConfigKind,
  DataScienceClusterInitializationKindStatus,
  DataScienceClusterKindStatus,
  OdhQuickStart,
  RoleBindingKind,
  ServingRuntimeKind,
  TemplateKind,
  NotebookKind,
  ModelRegistryKind,
} from '~/k8sTypes';

import type { StartNotebookData } from '~/pages/projects/types';
import type { AllowedUser } from '~/pages/notebookController/screens/admin/types';
import type { GroupsConfig } from '~/pages/groupSettings/groupTypes';
import type { StatusResponse } from '~/redux/types';
import type {
  BYONImage,
  ClusterSettingsType,
  ImageInfo,
  OdhApplication,
  OdhDocument,
  PrometheusQueryRangeResponse,
  PrometheusQueryResponse,
  SubscriptionStatusData,
} from '~/types';
import type {
  ArgoWorkflowPipelineVersion,
  ExperimentKFv2,
  GoogleRpcStatusKF,
  ListExperimentsResponseKF,
  ListPipelineRecurringRunsResourceKF,
  ListPipelineRunsResourceKF,
  ListPipelinesResponseKF,
  PipelineKFv2,
  PipelineRecurringRunKFv2,
  PipelineRunKFv2,
  PipelineVersionKFv2,
} from '~/concepts/pipelines/kfTypes';
import type { GrpcResponse } from '~/__mocks__/mlmd/utils';
import type { BuildMockPipelinveVersionsType } from '~/__mocks__';
import type { ArtifactStorage } from '~/concepts/pipelines/types';
import type { ConnectionTypeConfigMap } from '~/concepts/connectionTypes/types';

type SuccessErrorResponse = {
  success: boolean;
  error?: string;
};

type OdhResponse<V = SuccessErrorResponse> =
  | V
  | GenericStaticResponse<string, V>
  | RouteHandlerController;

type Replacement<R extends string = string> = Record<R, string | undefined>;
type Query<Q extends string = string> = Record<Q, string>;

type Options = { path?: Replacement; query?: Query; times?: number } | null;

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      interceptOdh: ((
        type: 'POST /api/accelerator-profiles',
        response?: OdhResponse,
      ) => Cypress.Chainable<null>) &
        ((
          type: 'DELETE /api/accelerator-profiles/:name',
          options: { path: { name: string } },
          response?: OdhResponse,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'PUT /api/accelerator-profiles/:name',
          options: { path: { name: string } },
          response: OdhResponse,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/groups-config',
          response: OdhResponse<GroupsConfig>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'PUT /api/groups-config',
          response: OdhResponse<GroupsConfig>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/components',
          options: {
            query?: {
              installed: 'true' | 'false';
            };
          } | null,
          response: OdhResponse<OdhApplication[]>,
        ) => Cypress.Chainable<null>) &
        ((type: 'GET /api/docs', response: OdhResponse<OdhDocument[]>) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/quickstarts',
          response: OdhResponse<OdhQuickStart[]>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/dsc/status',
          response: OdhResponse<DataScienceClusterKindStatus>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/status',
          response: OdhResponse<StatusResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/operator-subscription-status',
          response: OdhResponse<SubscriptionStatusData>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/status/openshift-ai-notebooks/allowedUsers',
          response: OdhResponse<AllowedUser[]>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/status/openshift-ai-notebooks/allowedUsers',
          response: OdhResponse<AllowedUser>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/rolebindings/opendatahub/openshift-ai-notebooks-image-pullers',
          response: OdhResponse<K8sResourceListResult<RoleBindingKind>>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/config',
          response: OdhResponse<DashboardConfigKind>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/dsci/status',
          response: OdhResponse<DataScienceClusterInitializationKindStatus>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/dashboardConfig/opendatahub/odh-dashboard-config',
          response: OdhResponse<DashboardConfigKind>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/cluster-settings',
          response: OdhResponse<ClusterSettingsType>,
        ) => Cypress.Chainable<null>) &
        ((type: 'PUT /api/cluster-settings', response: OdhResponse) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/namespaces/:namespace/:context',
          options: {
            path: {
              namespace: string;
              context: '0' | '1' | '2' | '*';
            };
          },
          response: OdhResponse<{ applied: boolean }>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/templates/:namespace',
          options: { path: { namespace: string }; query?: { labelSelector: string } },
          response: OdhResponse<K8sResourceListResult<TemplateKind>>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/templates/:namespace/:name',
          options: { path: { namespace: string; name: string } },
          response: OdhResponse<TemplateKind>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/templates/',
          response: OdhResponse<TemplateKind>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'DELETE /api/templates/:namespace/:name',
          options: { path: { namespace: string; name: string } },
          response: OdhResponse<TemplateKind>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'PATCH /api/templates/:namespace/:name',
          options: { path: { namespace: string; name: string } },
          response: OdhResponse<TemplateKind>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/servingRuntimes/',
          options: { query: { dryRun: 'All' } } | null,
          response: OdhResponse<ServingRuntimeKind>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/images/byon',
          response: OdhResponse<BYONImage[]>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/images/:type',
          options: { path: { type: string } },
          response: OdhResponse<ImageInfo[]>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'DELETE /api/images/:image',
          options: { path: { image: string } },
          response: OdhResponse<SuccessErrorResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'PUT /api/images/:image',
          options: { path: { image: string } },
          response: OdhResponse<SuccessErrorResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/images',
          response: OdhResponse<SuccessErrorResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/notebooks',
          response: OdhResponse<StartNotebookData>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'PATCH /api/notebooks',
          response: OdhResponse<StartNotebookData>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/notebooks/openshift-ai-notebooks/:username/status',
          options: {
            path: { username: string };
          },
          response: OdhResponse<NotebookKind>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/prometheus/pvc',
          response: OdhResponse<{ code: number; response: PrometheusQueryResponse }>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/prometheus/query',
          response: OdhResponse<{ code: number; response: PrometheusQueryResponse }>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/prometheus/serving',
          response: OdhResponse<{ code: number; response: PrometheusQueryRangeResponse }>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/prometheus/bias',
          response: OdhResponse<{ code: number; response: PrometheusQueryRangeResponse }>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/service/trustyai/:namespace/trustyai-service/metrics/all/requests',
          options: {
            path: { namespace: string };
            query?: { type: string };
          },
          response: OdhResponse<BaseMetricListResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/service/trustyai/:namespace/trustyai-service/metrics/spd/requests',
          options: {
            path: { namespace: string };
          },
          response: OdhResponse<BaseMetricListResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/service/trustyai/:namespace/trustyai-service/metrics/spd/request',
          options: {
            path: { namespace: string };
          },
          response: OdhResponse<BaseMetricListResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'DELETE /api/service/trustyai/:namespace/trustyai-service/metrics/spd/request',
          options: {
            path: { namespace: string };
          },
          response: OdhResponse<undefined>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/service/trustyai/:namespace/trustyai-service/metrics/dir/requests',
          options: {
            path: { namespace: string };
          },
          response: OdhResponse<BaseMetricListResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/service/trustyai/:namespace/trustyai-service/metrics/dir/request',
          options: {
            path: { namespace: string };
          },
          response: OdhResponse<BaseMetricCreationResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'DELETE /api/service/trustyai/:namespace/trustyai-service/metrics/dir/request',
          options: {
            path: { namespace: string };
          },
          response: OdhResponse<undefined>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models',
          options: { path: { serviceName: string; apiVersion: string } },
          response: OdhResponse<RegisteredModelList>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models',
          options: { path: { serviceName: string; apiVersion: string } },
          response: OdhResponse<RegisteredModel>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions',
          options: { path: { serviceName: string; apiVersion: string; registeredModelId: number } },
          response: OdhResponse<ModelVersionList>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId/versions',
          options: { path: { serviceName: string; apiVersion: string; registeredModelId: number } },
          response: OdhResponse<ModelVersion>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
          options: { path: { serviceName: string; apiVersion: string; registeredModelId: number } },
          response: OdhResponse<RegisteredModel>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/registered_models/:registeredModelId',
          options: { path: { serviceName: string; apiVersion: string; registeredModelId: number } },
          response: OdhResponse<RegisteredModel>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
          options: {
            path: { serviceName: string; apiVersion: string; modelVersionId: number };
          },
          response: OdhResponse<ModelVersion>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts',
          options: { path: { serviceName: string; apiVersion: string; modelVersionId: number } },
          response: OdhResponse<ModelArtifactList>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'POST /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId/artifacts',
          options: { path: { serviceName: string; apiVersion: string; modelVersionId: number } },
          response: OdhResponse<ModelArtifact>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'PATCH /api/service/modelregistry/:serviceName/api/model_registry/:apiVersion/model_versions/:modelVersionId',
          options: { path: { serviceName: string; apiVersion: string; modelVersionId: number } },
          response: OdhResponse<ModelVersion | undefined>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/modelRegistries',
          response: OdhResponse<K8sResourceListResult<ModelRegistryKind>>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/modelRegistries/:modelRegistryName',
          options: {
            path: { modelRegistryName: string };
          },
          response: OdhResponse<{ modelRegistry: ModelRegistryKind; databasePassword?: string }>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId`,
          options: {
            path: {
              namespace: string;
              serviceName: string;
              pipelineId: string;
              pipelineVersionId: string;
            };
          },
          response: OdhResponse<
            PipelineVersionKFv2 | ArgoWorkflowPipelineVersion | GoogleRpcStatusKF
          >,
        ) => Cypress.Chainable<null>) &
        ((
          type: `DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId`,
          options: {
            path: {
              namespace: string;
              serviceName: string;
              pipelineId: string;
              pipelineVersionId: string;
            };
            times?: number;
          },
          response: OdhResponse<GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId`,
          options: { path: { namespace: string; serviceName: string; pipelineId: string } },
          response: OdhResponse<PipelineKFv2 | GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId`,
          options: {
            path: { namespace: string; serviceName: string; pipelineId: string };
            times?: number;
          },
          response: OdhResponse<GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/upload_version`,
          options: { path: { namespace: string; serviceName: string }; times?: number },
          response: OdhResponse<PipelineVersionKFv2 | GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions`,
          options: {
            path: { namespace: string; serviceName: string; pipelineId: string };
            times?: number;
          },
          response: OdhResponse<PipelineVersionKFv2 | GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions`,
          options: {
            path: { namespace: string; serviceName: string; pipelineId: string };
            times?: number;
          },
          response: OdhResponse<BuildMockPipelinveVersionsType | GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines`,
          options: {
            path: { namespace: string; serviceName: string };
            query?: { sort_by: string };
            times?: number;
          },
          response: OdhResponse<ListPipelinesResponseKF | GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId`,
          options: { path: { namespace: string; serviceName: string; recurringRunId: string } },
          response: OdhResponse<GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId:mode`,
          options: {
            path: {
              namespace: string;
              serviceName: string;
              recurringRunId: string;
              mode: string;
            };
          },
          response: OdhResponse<{ data: object }>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId`,
          options: { path: { namespace: string; serviceName: string; recurringRunId: string } },
          response: OdhResponse<PipelineRecurringRunKFv2>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId`,
          options: { path: { namespace: string; serviceName: string; recurringRunId: string } },
          response: OdhResponse<GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/create`,
          options: { path: { namespace: string; serviceName: string }; times?: number },
          response: OdhResponse<PipelineKFv2 | GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/upload`,
          options: { path: { namespace: string; serviceName: string }; times?: number },
          response: OdhResponse<PipelineKFv2 | GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs`,
          options: { path: { namespace: string; serviceName: string } },
          response: OdhResponse<ListPipelineRunsResourceKF | GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs`,
          options: { path: { namespace: string; serviceName: string }; times?: number },
          response: OdhResponse<PipelineRunKFv2 | GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId`,
          options: { path: { namespace: string; serviceName: string; runId: string } },
          response: OdhResponse<GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId`,
          options: { path: { namespace: string; serviceName: string; runId: string } },
          response: OdhResponse<PipelineRunKFv2 | GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId`,
          options: { path: { namespace: string; serviceName: string; runId: string } },
          response: OdhResponse<GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments`,
          options: { path: { namespace: string; serviceName: string } },
          response: OdhResponse<ListExperimentsResponseKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments/:experimentId`,
          options: { path: { namespace: string; serviceName: string; experimentId: string } },
          response: OdhResponse<GoogleRpcStatusKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments/:experimentId`,
          options: { path: { namespace: string; serviceName: string; experimentId: string } },
          response: OdhResponse<ExperimentKFv2>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns`,
          options: { path: { namespace: string; serviceName: string }; times?: number },
          response: OdhResponse<PipelineRecurringRunKFv2>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns`,
          options: { path: { namespace: string; serviceName: string } },
          response: OdhResponse<ListPipelineRecurringRunsResourceKF>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetArtifacts`,
          options: { path: { namespace: string; serviceName: string }; times?: number },
          response: OdhResponse<GrpcResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetArtifactsByID`,
          options: { path: { namespace: string; serviceName: string } },
          response: OdhResponse<GrpcResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetArtifactTypes`,
          options: { path: { namespace: string; serviceName: string } },
          response: OdhResponse<GrpcResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetContextByTypeAndName`,
          options: { path: { namespace: string; serviceName: string } },
          response: OdhResponse<GrpcResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetArtifactsByContext`,
          options: { path: { namespace: string; serviceName: string } },
          response: OdhResponse<GrpcResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetExecutionsByContext`,
          options: { path: { namespace: string; serviceName: string } },
          response: OdhResponse<GrpcResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetExecutions`,
          options: { path: { namespace: string; serviceName: string } },
          response: OdhResponse<GrpcResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetExecutionsByID`,
          options: { path: { namespace: string; serviceName: string } },
          response: OdhResponse<GrpcResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: `POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetEventsByExecutionIDs`,
          options: { path: { namespace: string; serviceName: string } },
          response: OdhResponse<GrpcResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/rolebindings/opendatahub/openshift-ai-notebooks-image-pullers',
          response: OdhResponse<K8sResourceListResult<RoleBindingKind>>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/notebooks/openshift-ai-notebooks/:username/status',
          options: {
            path: { username: string };
          },
          response: OdhResponse<{ notebook: NotebookKind; isRunning: boolean }>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/artifacts/:artifactId',
          options: {
            query: { view: string };
            path: { namespace: string; serviceName: string; artifactId: string };
          },
          response: OdhResponse<ArtifactStorage>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/connection-types',
          response: OdhResponse<ConnectionTypeConfigMap[]>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'PATCH /api/connection-types/:name',
          options: {
            path: { name: string };
          },
          response: OdhResponse<SuccessErrorResponse>,
        ) => Cypress.Chainable<null>) &
        ((
          type: 'GET /api/connection-types/:name',
          options: {
            path: { name: string };
          },
          response: ConnectionTypeConfigMap,
        ) => Cypress.Chainable<null>);
    }
  }
}

Cypress.Commands.add(
  'interceptOdh',
  (type: string, ...args: [Options | null, OdhResponse<unknown>] | [OdhResponse<unknown>]) => {
    if (!type) {
      throw new Error('Invalid type parameter.');
    }
    const options = args.length === 2 ? args[0] : null;
    const response = (args.length === 2 ? args[1] : args[0]) ?? '';

    const pathParts = type.match(/:[a-z][a-zA-Z0-9-_]+/g);
    const [method, staticPathname] = type.split(' ');
    let pathname = staticPathname;
    if (pathParts?.length) {
      if (!options || !options.path) {
        throw new Error(`${type}: missing path replacements`);
      }
      const { path: pathReplacements } = options;
      pathParts.forEach((p) => {
        // remove the starting colun from the regex match
        const part = p.substring(1);
        const replacement = pathReplacements[part];
        if (!replacement) {
          throw new Error(`${type} missing path replacement: ${part}`);
        }
        pathname = pathname.replace(new RegExp(`:${part}\\b`), replacement);
      });
    }
    return cy.intercept(
      { method, pathname, query: options?.query, ...(options?.times && { times: options.times }) },
      response,
    );
  },
);

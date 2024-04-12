import { K8sResourceListResult } from '@openshift/dynamic-plugin-sdk-utils';
import type { GenericStaticResponse, RouteHandlerController } from 'cypress/types/net-stubbing';
import { BaseMetricCreationResponse, BaseMetricListResponse } from '~/api';
import type {
  DashboardConfigKind,
  DataScienceClusterInitializationKindStatus,
  DataScienceClusterKindStatus,
  ServingRuntimeKind,
  TemplateKind,
} from '~/k8sTypes';
import type { StatusResponse } from '~/redux/types';
import type {
  BYONImage,
  ClusterSettingsType,
  ImageInfo,
  OdhApplication,
  PrometheusQueryRangeResponse,
  PrometheusQueryResponse,
} from '~/types';

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

type Options = { path?: Replacement; query?: Query } | null;

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      interceptOdh(
        type: 'POST /api/accelerator-profiles',
        response?: OdhResponse,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'DELETE /api/accelerator-profiles/:name',
        options: { path: { name: string } },
        response?: OdhResponse,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'PUT /api/accelerator-profiles/:name',
        options: { path: { name: string } },
        response?: OdhResponse,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/components',
        options: {
          query?: {
            installed: 'true' | 'false';
          };
        } | null,
        response: OdhResponse<OdhApplication[]>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/dsc/status',
        response: OdhResponse<DataScienceClusterKindStatus>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/status',
        response: OdhResponse<StatusResponse>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/config',
        response: OdhResponse<DashboardConfigKind>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/dsci/status',
        response: OdhResponse<DataScienceClusterInitializationKindStatus>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/dashboardConfig/opendatahub/odh-dashboard-config',
        response: OdhResponse<DashboardConfigKind>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/cluster-settings',
        response: OdhResponse<ClusterSettingsType>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'PUT /api/cluster-settings',
        response: OdhResponse,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/namespaces/:namespace/:context',
        options: {
          path: {
            namespace: string;
            context: '0' | '1' | '2' | '*';
          };
        },
        response: OdhResponse<{ applied: boolean }>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/templates/:namespace',
        options: { path: { namespace: string }; query?: { labelSelector: string } },
        response: OdhResponse<K8sResourceListResult<TemplateKind>>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/templates/:namespace/:name',
        options: { path: { namespace: string; name: string } },
        response: OdhResponse<TemplateKind>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'POST /api/templates/',
        response: OdhResponse<TemplateKind>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'DELETE /api/templates/:namespace/:name',
        options: { path: { namespace: string; name: string } },
        response: OdhResponse<TemplateKind>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'PATCH /api/templates/:namespace/:name',
        options: { path: { namespace: string; name: string } },
        response: OdhResponse<TemplateKind>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'POST /api/servingRuntimes/',
        options: { query: { dryRun: 'All' } } | null,
        response: OdhResponse<ServingRuntimeKind>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/images/byon',
        response: OdhResponse<BYONImage[]>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/images/:type',
        response: OdhResponse<ImageInfo>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'DELETE /api/images/:image',
        options: { path: { image: string } },
        response: OdhResponse<SuccessErrorResponse>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'PUT /api/images/:image',
        options: { path: { image: string } },
        response: OdhResponse<SuccessErrorResponse>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'POST /api/images',
        response: OdhResponse<SuccessErrorResponse>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'POST /api/prometheus/pvc',
        response: OdhResponse<{ code: number; response: PrometheusQueryResponse }>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'POST /api/prometheus/query',
        response: OdhResponse<{ code: number; response: PrometheusQueryResponse }>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'POST /api/prometheus/serving',
        response: OdhResponse<{ code: number; response: PrometheusQueryRangeResponse }>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'POST /api/prometheus/bias',
        response: OdhResponse<{ code: number; response: PrometheusQueryRangeResponse }>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/service/trustyai/:namespace/trustyai-service/metrics/all/requests',
        options: {
          path: { namespace: string };
        },
        response: OdhResponse<BaseMetricListResponse>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/service/trustyai/:namespace/trustyai-service/metrics/spd/requests',
        options: {
          path: { namespace: string };
        },
        response: OdhResponse<BaseMetricListResponse>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'POST /api/service/trustyai/:namespace/trustyai-service/metrics/spd/request',
        options: {
          path: { namespace: string };
        },
        response: OdhResponse<BaseMetricListResponse>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'DELETE /api/service/trustyai/:namespace/trustyai-service/metrics/spd/request',
        options: {
          path: { namespace: string };
        },
        response: OdhResponse<undefined>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'GET /api/service/trustyai/:namespace/trustyai-service/metrics/dir/requests',
        options: {
          path: { namespace: string };
        },
        response: OdhResponse<BaseMetricListResponse>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'POST /api/service/trustyai/:namespace/trustyai-service/metrics/dir/request',
        options: {
          path: { namespace: string };
        },
        response: OdhResponse<BaseMetricCreationResponse>,
      ): Cypress.Chainable<null>;

      interceptOdh(
        type: 'DELETE /api/service/trustyai/:namespace/trustyai-service/metrics/dir/request',
        options: {
          path: { namespace: string };
        },
        response: OdhResponse<undefined>,
      ): Cypress.Chainable<null>;
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
    return cy.intercept({ method, pathname, query: options?.query }, response);
  },
);

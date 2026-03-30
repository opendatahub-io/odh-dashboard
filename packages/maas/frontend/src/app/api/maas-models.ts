import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restGET,
  restCREATE,
  restUPDATE,
  restDELETE,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import {
  CreateMaaSModelRefRequest,
  DeleteMaaSModelRefResponse,
  MaaSModel,
  MaaSModelRef,
  ModelReference,
  UpdateMaaSModelRefRequest,
} from '~/app/types/maas-model';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const isModelReference = (v: unknown): v is ModelReference =>
  isRecord(v) && typeof v.kind === 'string' && typeof v.name === 'string';

const isMaaSModelRef = (v: unknown): v is MaaSModelRef =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.namespace === 'string' &&
  (typeof v.displayName === 'string' || v.displayName === undefined) &&
  (typeof v.description === 'string' || v.description === undefined) &&
  isModelReference(v.modelRef);

const isDeleteMaaSModelRefResponse = (v: unknown): v is DeleteMaaSModelRefResponse =>
  isRecord(v) && typeof v.message === 'string';

/** GET /api/v1/models - Fetch the list of models that have been registered with MaaS */
export const getMaaSModelsList =
  (hostPath = '') =>
  (opts: APIOptions): Promise<MaaSModel[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/models`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<MaaSModel[]>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** POST /api/v1/maasmodel - Create a new MaaSModelRef */
export const createMaaSModelRef =
  (
    hostPath = '',
    requestBody: CreateMaaSModelRefRequest = {
      name: '',
      namespace: '',
      modelRef: { kind: '', name: '' },
      uid: '',
      displayName: '',
      description: '',
    },
  ) =>
  (opts: APIOptions): Promise<MaaSModelRef> =>
    handleRestFailures(
      restCREATE(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/maasmodel`, requestBody, {}, opts),
    ).then((response) => {
      if (isMaaSModelRef(response)) {
        return response;
      }
      throw new Error('Invalid response format');
    });

/** PUT /api/v1/maasmodel/:namespace/:name - Update a MaaSModelRef */
export const updateMaaSModelRef =
  (
    namespace: string,
    name: string,
    requestBody: UpdateMaaSModelRefRequest = {
      modelRef: { kind: '', name: '' },
    },
    hostPath = '',
  ) =>
  (opts: APIOptions): Promise<MaaSModelRef> =>
    handleRestFailures(
      restUPDATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/maasmodel/${namespace}/${name}`,
        requestBody,
        {},
        opts,
      ),
    ).then((response) => {
      if (isMaaSModelRef(response)) {
        return response;
      }
      throw new Error('Invalid response format');
    });

/** DELETE /api/v1/maasmodel/:namespace/:name - Delete a MaaSModelRef */
export const deleteMaaSModelRef =
  (namespace: string, name: string, hostPath = '') =>
  (opts: APIOptions): Promise<DeleteMaaSModelRefResponse> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/maasmodel/${namespace}/${name}`,
        {},
        {},
        opts,
      ),
    ).then((response) => {
      if (isDeleteMaaSModelRefResponse(response)) {
        return response;
      }
      throw new Error('Invalid response format');
    });

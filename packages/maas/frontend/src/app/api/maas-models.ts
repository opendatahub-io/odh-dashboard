import {
  APIOptions,
  assembleModArchBody,
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

/** POST /api/v1/maasmodel - Create a new MaaSModelRef. Pass dryRun=true to validate without persisting. */
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
    dryRun = false,
  ) =>
  (opts: APIOptions): Promise<MaaSModelRef> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/maasmodel${dryRun ? '?dryRun=true' : ''}`,
        assembleModArchBody(requestBody),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isMaaSModelRef(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** PUT /api/v1/maasmodel/:namespace/:name - Update a MaaSModelRef. Pass dryRun=true to validate without persisting. */
export const updateMaaSModelRef =
  (
    namespace: string,
    name: string,
    requestBody: UpdateMaaSModelRefRequest = {
      modelRef: { kind: '', name: '' },
    },
    hostPath = '',
    dryRun = false,
  ) =>
  (opts: APIOptions): Promise<MaaSModelRef> =>
    handleRestFailures(
      restUPDATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/maasmodel/${namespace}/${name}${dryRun ? '?dryRun=true' : ''}`,
        assembleModArchBody(requestBody),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isMaaSModelRef(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** DELETE /api/v1/maasmodel/:namespace/:name - Delete a MaaSModelRef. Pass dryRun=true to validate without persisting. */
export const deleteMaaSModelRef =
  (namespace: string, name: string, hostPath = '', dryRun = false) =>
  (opts: APIOptions): Promise<DeleteMaaSModelRefResponse> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/maasmodel/${namespace}/${name}${dryRun ? '?dryRun=true' : ''}`,
        {},
        {},
        opts,
      ),
    ).then((response) => {
      if (
        isModArchResponse<unknown>(response) &&
        (response.data == null || isDeleteMaaSModelRefResponse(response.data))
      ) {
        return response.data ?? { message: '' };
      }
      throw new Error('Invalid response format');
    });

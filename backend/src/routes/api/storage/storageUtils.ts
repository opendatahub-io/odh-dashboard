import { Client as MinioClient } from 'minio';
import {
  DSPipelineKind,
  K8sResourceCommon,
  K8sResourceListResult,
  KubeFastifyInstance,
  OauthFastifyRequest,
  SecretKind,
} from '../../../types';
import { Transform, TransformOptions } from 'stream';
import { passThroughResource } from '../k8s/pass-through';

export interface PreviewStreamOptions extends TransformOptions {
  peek: number;
}
const DataSciencePipelineApplicationModel = {
  apiVersion: 'v1alpha1',
  apiGroup: 'datasciencepipelinesapplications.opendatahub.io',
  kind: 'DataSciencePipelinesApplication',
  plural: 'datasciencepipelinesapplications',
};

/**
 * Transform stream that only stream the first X number of bytes.
 */
export class PreviewStream extends Transform {
  constructor({ peek, ...opts }: PreviewStreamOptions) {
    // acts like passthrough
    let transform: TransformOptions['transform'] = (chunk, _encoding, callback) =>
      callback(undefined, chunk);
    // implements preview - peek must be positive number
    if (peek && peek > 0) {
      let size = 0;
      transform = (chunk, _encoding, callback) => {
        const delta = peek - size;
        size += chunk.length;
        if (size >= peek) {
          callback(undefined, chunk.slice(0, delta));
          this.resume(); // do not handle any subsequent data
          return;
        }
        callback(undefined, chunk);
      };
    }
    super({ ...opts, transform });
  }
}

export async function getDspa(
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  namespace: string,
): Promise<DSPipelineKind> {
  const kc = fastify.kube.config;
  const cluster = kc.getCurrentCluster();

  // retreive the gating resource by name and namespace
  const dspaResponse = await passThroughResource<K8sResourceListResult<DSPipelineKind>>(
    fastify,
    request,
    {
      url: `${cluster.server}/apis/${DataSciencePipelineApplicationModel.apiGroup}/${DataSciencePipelineApplicationModel.apiVersion}/namespaces/${namespace}/${DataSciencePipelineApplicationModel.plural}`,
      method: 'GET',
    },
  ).catch((e) => {
    throw `A ${e.statusCode} error occurred when trying to fetch dspa aws storage credentials: ${
      e.response?.body?.message || e?.response?.statusMessage
    }`;
  });

  function isK8sResourceList<T extends K8sResourceCommon>(
    data: any,
  ): data is K8sResourceListResult<T> {
    return data && data.items !== undefined;
  }

  if (!isK8sResourceList(dspaResponse)) {
    throw `A ${dspaResponse.code} error occurred when trying to fetch dspa aws storage credentials: ${dspaResponse.message}`;
  }

  const dspas = dspaResponse.items;

  if (!dspas || !dspas.length) {
    throw 'No Data Science Pipeline Application found';
  }

  return dspas[0];
}

async function getDspaSecretKeys(
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  namespace: string,
  dspa: DSPipelineKind,
): Promise<{ accessKey: string; secretKey: string }> {
  try {
    const kc = fastify.kube.config;
    const cluster = kc.getCurrentCluster();

    const secretResp = await passThroughResource<SecretKind>(fastify, request, {
      url: `${cluster.server}/api/v1/namespaces/${namespace}/secrets/${dspa.spec.objectStorage.externalStorage.s3CredentialsSecret.secretName}`,
      method: 'GET',
    }).catch((e) => {
      throw `A ${e.statusCode} error occurred when trying to fetch secret for aws credentials: ${
        e.response?.body?.message || e?.response?.statusMessage
      }`;
    });

    const secret = secretResp as SecretKind;

    const accessKey = atob(
      secret.data[dspa.spec.objectStorage.externalStorage.s3CredentialsSecret.accessKey],
    );
    const secretKey = atob(
      secret.data[dspa.spec.objectStorage.externalStorage.s3CredentialsSecret.secretKey],
    );

    if (!accessKey || !secretKey) {
      throw 'Access key or secret key is empty';
    }

    return { accessKey, secretKey };
  } catch (err) {
    console.error('Unable to get dspa secret keys: ', err);
    throw new Error('Unable to get dspa secret keys: ' + err);
  }
}

/**
 * Create minio client with aws instance profile credentials if needed.
 * @param config minio client options where `accessKey` and `secretKey` are optional.
 */
export async function setupMinioClient(
  fastify: KubeFastifyInstance,
  request: OauthFastifyRequest,
  namespace: string,
): Promise<{ client: MinioClient; bucket: string }> {
  try {
    const dspa = await getDspa(fastify, request, namespace);

    // check if object storage connection is available
    if (
      !dspa.status?.conditions?.find((c) => c.type === 'APIServerReady' && c.status === 'True') ||
      !dspa.status?.conditions?.find(
        (c) => c.type === 'ObjectStoreAvailable' && c.status === 'True',
      )
    ) {
      throw 'Object store is not available';
    }

    const externalStorage = dspa.spec.objectStorage.externalStorage;
    if (externalStorage) {
      const { region, host: endPoint, bucket } = externalStorage;
      const { accessKey, secretKey } = await getDspaSecretKeys(fastify, request, namespace, dspa);
      return {
        client: new MinioClient({ accessKey, secretKey, endPoint, region }),
        bucket,
      };
    }
  } catch (err) {
    console.error('Unable to create minio client: ', err);
    throw new Error('Unable to create minio client: ' + err);
  }
}

/** MinioRequestConfig describes the info required to retrieve an artifact. */
export interface MinioRequestConfig {
  bucket: string;
  key: string;
  client: MinioClient;
  peek?: number;
}

/**
 * Returns a stream from an object in a s3 compatible object store (e.g. minio).
 *
 * @param param.bucket Bucket name to retrieve the object from.
 * @param param.key Key of the object to retrieve.
 * @param param.client Minio client.
 * @param param.peek Number of bytes to preview.
 *
 */
export async function getObjectStream({
  key,
  client,
  bucket,
  peek = 1e8, // 100mb
}: MinioRequestConfig): Promise<Transform> {
  const safePeek = Math.min(peek, 1e8); // 100mb
  const stream = await client.getObject(bucket, key);
  return stream.pipe(new PreviewStream({ peek: safePeek }));
}

export async function getObjectSize({ bucket, key, client }: MinioRequestConfig): Promise<number> {
  const stat = await client.statObject(bucket, key);
  return stat.size;
}

import { Client as MinioClient } from 'minio';
import { DSPipelineKind, KubeFastifyInstance } from '../../../types';
import { Transform, TransformOptions } from 'stream';

export interface PreviewStreamOptions extends TransformOptions {
  peek: number;
}

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
  token: string,
  namespace: string,
): Promise<DSPipelineKind> {
  const dspaResponse = await fastify.kube.customObjectsApi
    .listNamespacedCustomObject(
      'datasciencepipelinesapplications.opendatahub.io',
      'v1alpha1',
      namespace,
      'datasciencepipelinesapplications',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    )
    .catch((e) => {
      throw `A ${e.statusCode} error occurred when trying to fetch dspa aws storage credentials: ${
        e.response?.body?.message || e?.response?.statusMessage
      }`;
    });

  const dspas = (
    dspaResponse?.body as {
      items: DSPipelineKind[];
    }
  )?.items;

  if (!dspas || !dspas.length) {
    throw 'No Data Science Pipeline Application found';
  }

  return dspas[0];
}

async function getDspaSecretKeys(
  fastify: KubeFastifyInstance,
  token: string,
  namespace: string,
  dspa: DSPipelineKind,
): Promise<{ accessKey: string; secretKey: string }> {
  try {
    const secret = await fastify.kube.coreV1Api.readNamespacedSecret(
      dspa.spec.objectStorage.externalStorage.s3CredentialsSecret.secretName,
      namespace,
      undefined,
      undefined,
      undefined,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );

    const accessKey = atob(
      secret.body.data[dspa.spec.objectStorage.externalStorage.s3CredentialsSecret.accessKey],
    );
    const secretKey = atob(
      secret.body.data[dspa.spec.objectStorage.externalStorage.s3CredentialsSecret.secretKey],
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
  token: string,
  namespace: string,
): Promise<{ client: MinioClient; bucket: string }> {
  try {
    const dspa = await getDspa(fastify, token, namespace);

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
      const { accessKey, secretKey } = await getDspaSecretKeys(fastify, token, namespace, dspa);
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

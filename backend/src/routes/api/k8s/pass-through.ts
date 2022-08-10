import https, { RequestOptions } from 'https';
import { K8sResourceCommon, K8sStatus, KubeFastifyInstance } from '../../../types';

type PassThroughData = {
  method: string;
  requestData: string;
  url: string;
};

const isK8sStatus = (data: Record<string, unknown>): data is K8sStatus => data.kind === 'Status';

export const passThrough = async (
  data: PassThroughData,
  fastify: KubeFastifyInstance,
): Promise<{ response: K8sResourceCommon }> => {
  const kc = fastify.kube.config;
  const { method, requestData, url } = data;
  console.debug('-----method', method);

  // TODO: Remove when bug is fixed - https://issues.redhat.com/browse/HAC-1825
  let safeURL = url;
  if (method.toLowerCase() === 'post') {
    // Core SDK builds the wrong path for k8s -- can't post to a resource name; remove the name from the url
    // eg: POST /.../configmaps/my-config-map => POST /.../configmaps
    const urlParts = url.split('/');
    urlParts.pop();
    safeURL = urlParts.join('/');
  }
  console.debug('-----', safeURL);

  return new Promise((resolve, reject) => {
    const kubeOptions: Parameters<typeof kc.applyToRequest>[0] = { url: safeURL };
    kc.applyToRequest(kubeOptions).then(() => {
      const { headers, ca } = kubeOptions;
      const requestOptions: RequestOptions = {
        ca,
        headers,
        method,
      };

      if (requestData) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'Content-Type': `application/${
            method === 'PATCH' ? 'json-patch+json' : 'json'
          };charset=UTF-8`,
          'Content-Length': requestData.length,
        };
      }

      const httpsRequest = https
        .request(safeURL, requestOptions, (res) => {
          let data = '';
          res
            .setEncoding('utf8')
            .on('data', (chunk) => {
              data += chunk;
            })
            .on('end', () => {
              let parsedData: K8sResourceCommon | K8sStatus;
              try {
                parsedData = JSON.parse(data);
              } catch (e) {
                // Likely not JSON, print the error and return the content to the client
                fastify.log.error(`Parsing response error: ${e}, ${data}`);
                reject({ code: 500, response: data });
                return;
              }

              if (isK8sStatus(parsedData)) {
                fastify.log.warn(`Status Object, ${JSON.stringify(parsedData, null, 2)}`);
                reject({ code: parsedData.code, response: parsedData });
                return;
              }

              console.debug('-----', parsedData);
              resolve({ response: parsedData });
            })
            .on('error', (error) => {
              if (error) {
                fastify.log.error(`Kube parsing response error: ${error}`);
                reject({ code: 500, response: error });
              }
            });
        })
        .on('error', (error) => {
          fastify.log.error(`Kube request error: ${error}`);
          reject({ code: 500, response: error });
        });

      if (requestData) {
        httpsRequest.write(requestData);
      }

      httpsRequest.end();
    });
  });
};

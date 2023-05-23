import { FastifyReply } from 'fastify';
import { KubeFastifyInstance, OauthFastifyRequest } from '../../../types';
import { proxyCall } from '../../../utils/httpUtils';
import { logRequestDetails } from '../../../utils/fileUtils';
import { Buffer } from 'buffer';

export default async (fastify: KubeFastifyInstance): Promise<void> => {
  fastify.post(
    '/*',
    (
      req: OauthFastifyRequest<{
        Params: { '*': string };
        Body: {
          method: string;
          host: string;
          data?: Record<string, unknown>;
          fileContents?: string;
          queryParams?: Record<string, unknown>;
        };
      }>,
      reply: FastifyReply,
    ) => {
      logRequestDetails(fastify, req);

      const { method, host, fileContents, data = {}, queryParams = {} } = req.body;

      let requestData: string | Buffer;
      let contentType: string | undefined;
      if (fileContents) {
        fastify.log.info('File upload');
        const boundaryBlock = 'xxxxxxxxxx';

        let prefixHeaders = '';
        prefixHeaders += '--' + boundaryBlock + '\r\n';

        // TODO: Support non yaml files
        prefixHeaders +=
          'Content-Disposition: form-data; name="uploadfile"; filename="uploadedFile.yml"\r\n';
        prefixHeaders += 'Content-Type:application/x-yaml\r\n\r\n';

        requestData = Buffer.concat([
          Buffer.from(prefixHeaders, 'utf8'),
          Buffer.from(fileContents, 'binary'),
          Buffer.from('\r\n--' + boundaryBlock + '--\r\n', 'utf8'),
        ]);
        contentType = `multipart/form-data; boundary=${boundaryBlock}`;
      } else {
        requestData = JSON.stringify(data);
      }

      const queryParamString = Object.keys(queryParams)
        .filter((key) => queryParams[key] !== undefined)
        .map((key) => `${key}=${queryParams[key]}`)
        .join('&');

      const path = req.params['*'];
      const url = `${host}/${path}${queryParamString ? `?${queryParamString}` : ''}`;

      return proxyCall(fastify, req, {
        method,
        url,
        overrideContentType: contentType,
        requestData,
        rejectUnauthorized: false,
      }).catch((error) => {
        if (error.code && error.response) {
          const { code, response } = error;
          reply.code(code);
          reply.send(response);
        } else {
          throw error;
        }
      });
    },
  );
};

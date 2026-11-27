/**
 * @jest-environment node
 */
import { resolve } from 'path';
import {
  ContractApiClient,
  loadOpenAPISchema,
  startGoTestFixture,
  type GoTestFixture,
} from '@odh-dashboard/contract-tests';

describe('Connection list and type resolution contracts', () => {
  const schema = loadOpenAPISchema('api/openapi/data-connect-hub.yaml');
  let fixture: GoTestFixture | undefined;
  let client: ContractApiClient;

  beforeAll(async () => {
    fixture = await startGoTestFixture({
      bffDir: resolve(__dirname, '../../bff'),
      packagePath: './internal/api',
      testName: 'TestConnectionTypeResolutionContractServer',
    });
    client = new ContractApiClient({ baseUrl: fixture.url });
  }, 180000);

  afterAll(async () => fixture?.stop());

  describe.each(['', '&resolve_connection_types=false', '&resolve_connection_types=true'])(
    'List validation with query %s',
    (query) => {
      it('should reject an invalid item after a valid item without partial data', async () => {
        const result = await client.get(`/api/v1/connections?namespace=invalid-connection${query}`);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect({ status: result.error.status, data: result.error.data }).toMatchContract(schema, {
            ref: '#/components/responses/InternalServerError/content/application~1json/schema',
            status: 500,
          });
          expect(result.error.data).not.toHaveProperty('data');
        }
      });

      it('should preserve a successful empty list', async () => {
        const result = await client.get(`/api/v1/connections?namespace=empty-connections${query}`);
        expect(result).toMatchContract(schema, {
          ref: '#/components/responses/ConnectionsResponse/content/application~1json/schema',
          status: 200,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.data).toEqual({ data: [] });
        }
      });
    },
  );

  describe.each([
    { name: 'list', suffix: '', response: 'ConnectionsResponse', dataPath: 'data.0' },
    {
      name: 'detail',
      suffix: '/550e8400-e29b-41d4-a716-446655440001',
      response: 'ConnectionResponse',
      dataPath: 'data',
    },
  ])('$name', ({ suffix, response, dataPath }) => {
    it.each(['omitted', 'null'])(
      'should reject %s credentials_fields without returning partial data',
      async (namespace) => {
        const result = await client.get(
          `/api/v1/connections${suffix}?namespace=${namespace}&resolve_connection_types=true`,
        );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect({ status: result.error.status, data: result.error.data }).toMatchContract(schema, {
            ref: '#/components/responses/InternalServerError/content/application~1json/schema',
            status: 500,
          });
          expect(result.error.data).not.toHaveProperty('data');
        }
      },
    );

    it('should preserve an empty credentials_fields array', async () => {
      const result = await client.get(
        `/api/v1/connections${suffix}?namespace=empty&resolve_connection_types=true`,
      );
      expect(result).toMatchContract(schema, {
        ref: `#/components/responses/${response}/content/application~1json/schema`,
        status: 200,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.data).toHaveProperty(
          `${dataPath}.resource.data_connection_type.resource.credentials_fields`,
          [],
        );
      }
    });
  });
});

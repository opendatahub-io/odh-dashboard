/* eslint-disable camelcase */
/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('AutoML API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  const apiSchema = loadOpenAPISchema('api/openapi/automl.yaml');

  const NS = 'my-project';
  const NS_NO_DSPA = 'no-dspa';
  const SECRET = 'data-connection';
  const BUCKET = 's3-bucket';

  const SUCCEEDED_RUN = '9ec21d90-baa0-4a6b-bb2a-40d9d4b43c54';
  const SUCCEEDED_RUN_2 = 'a4a27f0d-2cbd-4bb9-b501-335ca0ec14b2';
  const TABULAR_CSV_FILE = 'automl input data/TitanicFullMF.csv';
  const TIMESERIES_CSV_FILE = 'automl input data/timeseries/m4_hourly_subset_train.csv';
  const NESTED_CSV_FILE = TIMESERIES_CSV_FILE;

  const KNOWN_REGISTRY = '6fb09186-eb11-4b68-8e3a-8017fb3bf18f';
  const UNKNOWN_REGISTRY = '00000000-0000-0000-0000-000000000000';

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const result = await apiClient.get('/healthcheck');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(200);
      }
    });
  });

  describe('User Endpoint', () => {
    it('should retrieve current user information', async () => {
      const result = await apiClient.get('/api/v1/user');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ConfigResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Namespaces Endpoint', () => {
    it('should successfully retrieve namespaces', async () => {
      const result = await apiClient.get('/api/v1/namespaces');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(200);
      }
    });
  });

  describe('Model Registries Endpoint', () => {
    it('should return model registries list', async () => {
      const result = await apiClient.get('/api/v1/model-registries');
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/ModelRegistriesResponse/content/application~1json/schema',
        status: 200,
      });
    });
  });

  describe('Secrets Endpoint', () => {
    it('should retrieve all secrets', async () => {
      const result = await apiClient.get(`/api/v1/secrets?namespace=${NS}`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/SecretsResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should retrieve storage secrets when type=storage', async () => {
      const result = await apiClient.get(`/api/v1/secrets?namespace=${NS}&type=storage`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/SecretsResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should return 400 when namespace parameter is missing', async () => {
      const result = await apiClient.get('/api/v1/secrets');
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });
  });

  describe('S3 File Download Endpoint', () => {
    it('should successfully download a file', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files/${encodeURIComponent(
          TABULAR_CSV_FILE,
        )}?namespace=${NS}&secretName=${SECRET}`,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(200);
      }
    });

    it('should download via DSPA mode when secretName is omitted', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files/${encodeURIComponent(TABULAR_CSV_FILE)}?namespace=${NS}`,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(200);
      }
    });

    it('should return 400 when namespace parameter is missing', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files/${encodeURIComponent(
          TABULAR_CSV_FILE,
        )}?secretName=${SECRET}&bucket=${BUCKET}`,
      );
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });

    it('should return 404 when namespace has no DSPA and secretName is omitted', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files/${encodeURIComponent(TABULAR_CSV_FILE)}?namespace=${NS_NO_DSPA}`,
      );
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(404);
    });
  });

  describe('S3 File Upload Endpoint', () => {
    const buildFormDataWithFile = (): FormData => {
      const form = new FormData();
      form.append('file', new Blob(['col1,col2\nval1,val2'], { type: 'text/csv' }), 'file.csv');
      return form;
    };

    it('should return 201 on successful upload', async () => {
      const form = buildFormDataWithFile();
      const result = await apiClient.postFormData(
        `/api/v1/s3/files/file.csv?namespace=${NS}&secretName=${SECRET}&bucket=${BUCKET}`,
        form,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/S3UploadSuccess',
        status: 201,
      });
    });

    it('should return 400 when namespace parameter is missing', async () => {
      const form = buildFormDataWithFile();
      const result = await apiClient.postFormData(
        `/api/v1/s3/files/file.csv?secretName=${SECRET}&bucket=${BUCKET}`,
        form,
      );
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });

    it('should return 400 when request body has no file part', async () => {
      const form = new FormData();
      form.append('other', 'value');
      const result = await apiClient.postFormData(
        `/api/v1/s3/files/file.csv?namespace=${NS}&secretName=${SECRET}&bucket=${BUCKET}`,
        form,
      );
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });
  });

  describe('S3 File Schema Endpoint', () => {
    it('should retrieve CSV column schema', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files/${encodeURIComponent(
          TABULAR_CSV_FILE,
        )}?view=schema&namespace=${NS}&secretName=${SECRET}`,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/S3FileSchemaResponse',
        status: 200,
      });
    });

    it('should handle nested path keys', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files/${encodeURIComponent(
          NESTED_CSV_FILE,
        )}?view=schema&namespace=${NS}&secretName=${SECRET}`,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/schemas/S3FileSchemaResponse',
        status: 200,
      });
    });

    it('should return 400 when namespace parameter is missing', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files/${encodeURIComponent(
          TABULAR_CSV_FILE,
        )}?view=schema&secretName=${SECRET}&bucket=${BUCKET}`,
      );
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });
  });

  describe('S3 Files List Endpoint', () => {
    it('should list files from S3', async () => {
      const result = await apiClient.get(
        `/api/v1/s3/files?namespace=${NS}&secretName=${SECRET}&bucket=${BUCKET}`,
      );
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/S3GetFilesResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should list files via DSPA mode', async () => {
      const result = await apiClient.get(`/api/v1/s3/files?namespace=${NS}`);
      expect(result).toMatchContract(apiSchema, {
        ref: '#/components/responses/S3GetFilesResponse/content/application~1json/schema',
        status: 200,
      });
    });

    it('should return 400 when namespace parameter is missing', async () => {
      const result = await apiClient.get(`/api/v1/s3/files?secretName=${SECRET}&bucket=${BUCKET}`);
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });
  });

  describe('Register Model Endpoint', () => {
    it('should return 404 when registryId does not match any registry', async () => {
      const result = await apiClient.post(
        `/api/v1/model-registries/${UNKNOWN_REGISTRY}/models?namespace=${NS}`,
        {
          s3_path: 'path/model.bin',
          model_name: 'test-model',
          version_name: 'v1',
        },
      );
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(404);
    });

    it('should return 400 for invalid request body', async () => {
      const result = await apiClient.post(
        `/api/v1/model-registries/${KNOWN_REGISTRY}/models?namespace=${NS}`,
        {
          model_name: 'test-model',
        },
      );
      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(400);
    });
  });

  describe('Pipeline Runs Endpoints', () => {
    describe('List Pipeline Runs', () => {
      it('should retrieve pipeline runs list', async () => {
        const result = await apiClient.get(`/api/v1/pipeline-runs?namespace=${NS}`);
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunsResponse/content/application~1json/schema',
          status: 200,
        });
      });

      it('should support pagination parameters', async () => {
        const result = await apiClient.get(
          `/api/v1/pipeline-runs?namespace=${NS}&pageSize=10&page=1`,
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunsResponse/content/application~1json/schema',
          status: 200,
        });
      });

      it('should return 404 when namespace has no DSPA', async () => {
        const result = await apiClient.get(`/api/v1/pipeline-runs?namespace=${NS_NO_DSPA}`);
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(404);
      });
    });

    describe('Get Single Pipeline Run', () => {
      it('should retrieve a single pipeline run by ID', async () => {
        const result = await apiClient.get(
          `/api/v1/pipeline-runs/${SUCCEEDED_RUN}?namespace=${NS}`,
        );
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/PipelineRunResponse/content/application~1json/schema',
          status: 200,
        });
      });

      it('should reject non-existent run ID', async () => {
        const result = await apiClient.get(
          `/api/v1/pipeline-runs/non-existent-run-id?namespace=${NS}`,
        );
        expect(result.success).toBe(false);
      });
    });

    describe('Create Pipeline Run', () => {
      it('should create a tabular binary pipeline run', async () => {
        const result = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'contract-test-tabular',
          train_data_secret_name: SECRET,
          train_data_bucket_name: BUCKET,
          train_data_file_key: TABULAR_CSV_FILE,
          label_column: 'target',
          task_type: 'binary',
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/CreatePipelineRunResponse/content/application~1json/schema',
          status: 200,
        });
      });

      it('should create a tabular regression pipeline run', async () => {
        const result = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'contract-test-regression',
          train_data_secret_name: SECRET,
          train_data_bucket_name: BUCKET,
          train_data_file_key: TABULAR_CSV_FILE,
          label_column: 'price',
          task_type: 'regression',
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/CreatePipelineRunResponse/content/application~1json/schema',
          status: 200,
        });
      });

      it('should create a timeseries pipeline run', async () => {
        const result = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'contract-test-timeseries',
          train_data_secret_name: SECRET,
          train_data_bucket_name: BUCKET,
          train_data_file_key: TABULAR_CSV_FILE,
          task_type: 'timeseries',
          target: 'sales',
          id_column: 'store_id',
          timestamp_column: 'date',
        });
        expect(result).toMatchContract(apiSchema, {
          ref: '#/components/responses/CreatePipelineRunResponse/content/application~1json/schema',
          status: 200,
        });
      });

      it('should return 400 for missing required fields', async () => {
        const result = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'incomplete-run',
        });
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
      });

      it('should return 400 for invalid task_type', async () => {
        const result = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'bad-task-type',
          train_data_secret_name: SECRET,
          train_data_bucket_name: BUCKET,
          train_data_file_key: TABULAR_CSV_FILE,
          label_column: 'target',
          task_type: 'unsupported',
        });
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
      });
    });

    describe('Terminate Pipeline Run', () => {
      let createdRunId: string;

      it('should create a run to terminate', async () => {
        const result = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'terminate-target',
          train_data_secret_name: SECRET,
          train_data_bucket_name: BUCKET,
          train_data_file_key: TABULAR_CSV_FILE,
          label_column: 'target',
          task_type: 'binary',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          type RunEnvelope = { data: { run_id: string } };
          createdRunId = (result.response.data as RunEnvelope).data.run_id;
          expect(createdRunId).toBeDefined();
        }
      });

      it('should terminate the newly created (PENDING) run', async () => {
        expect(createdRunId).toBeDefined();
        const result = await apiClient.post(
          `/api/v1/pipeline-runs/${createdRunId}/terminate?namespace=${NS}`,
          {},
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.status).toBe(200);
        }
      });

      it('should return 400 when terminating a SUCCEEDED run', async () => {
        const result = await apiClient.post(
          `/api/v1/pipeline-runs/${SUCCEEDED_RUN}/terminate?namespace=${NS}`,
          {},
        );
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
      });

      it('should reject non-existent run ID', async () => {
        const result = await apiClient.post(
          `/api/v1/pipeline-runs/non-existent-run-id/terminate?namespace=${NS}`,
          {},
        );
        expect(result.success).toBe(false);
      });
    });

    describe('Retry Pipeline Run', () => {
      let failedRunId: string;

      it('should create and terminate a run to produce a FAILED state', async () => {
        const createResult = await apiClient.post(`/api/v1/pipeline-runs?namespace=${NS}`, {
          display_name: 'retry-target',
          train_data_secret_name: SECRET,
          train_data_bucket_name: BUCKET,
          train_data_file_key: TABULAR_CSV_FILE,
          label_column: 'target',
          task_type: 'binary',
        });
        expect(createResult.success).toBe(true);
        if (createResult.success) {
          type RunEnvelope = { data: { run_id: string } };
          failedRunId = (createResult.response.data as RunEnvelope).data.run_id;
        }
        const terminateResult = await apiClient.post(
          `/api/v1/pipeline-runs/${failedRunId}/terminate?namespace=${NS}`,
          {},
        );
        expect(terminateResult.success).toBe(true);
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 3000);
        });
      });

      it('should retry the FAILED run', async () => {
        expect(failedRunId).toBeDefined();
        const result = await apiClient.post(
          `/api/v1/pipeline-runs/${failedRunId}/retry?namespace=${NS}`,
          {},
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.status).toBe(200);
        }
      });

      it('should return 400 when retrying a SUCCEEDED run', async () => {
        const result = await apiClient.post(
          `/api/v1/pipeline-runs/${SUCCEEDED_RUN}/retry?namespace=${NS}`,
          {},
        );
        expect(result.success).toBe(false);
        expect(result.error?.status).toBe(400);
      });

      it('should reject non-existent run ID', async () => {
        const result = await apiClient.post(
          `/api/v1/pipeline-runs/non-existent-run-id/retry?namespace=${NS}`,
          {},
        );
        expect(result.success).toBe(false);
      });
    });

    describe('Delete Pipeline Run', () => {
      it('should delete a SUCCEEDED run', async () => {
        const result = await apiClient.delete(
          `/api/v1/pipeline-runs/${SUCCEEDED_RUN_2}?namespace=${NS}`,
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.response.status).toBe(200);
        }
      });

      it('should reject non-existent run ID', async () => {
        const result = await apiClient.delete(
          `/api/v1/pipeline-runs/non-existent-run-id?namespace=${NS}`,
        );
        expect(result.success).toBe(false);
      });
    });
  });
});

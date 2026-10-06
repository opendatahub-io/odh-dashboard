import { applyOpenShiftYaml, pollUntilSuccess } from './baseCommands';
import type { CommandLineResult, ExternalVectorStoreTestData } from '../../types';

const PGVECTOR_RESOURCE_FIXTURE = 'resources/genAi/external-vector-store-pgvector.yaml';
const LLAMA_STACK_PORT = 8321;

type EmbeddingsResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
};

const replaceFixturePlaceholders = (
  template: string,
  replacements: Record<string, string>,
): string =>
  Object.entries(replacements).reduce(
    (rendered, [key, value]) => rendered.replaceAll(`__${key}__`, value),
    template,
  );

const escapeShellSingleQuotes = (value: string): string => value.replace(/'/g, `'"'"'`);

const escapeSqlLiteral = (value: string): string => value.replace(/'/g, `''`);

const getPgVectorTableName = (vectorStoreId: string): string => {
  if (!/^vs_[a-zA-Z0-9-]+$/.test(vectorStoreId)) {
    throw new Error(`Unsupported vector store ID for PGVector fixture: ${vectorStoreId}`);
  }
  return `vs_${vectorStoreId.replace(/-/g, '_')}`;
};

const getClusterPostgreSQLImage = (): Cypress.Chainable<string> => {
  const applicationsNamespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (!applicationsNamespace) {
    throw new Error('APPLICATIONS_NAMESPACE is required to discover the PostgreSQL image');
  }

  return cy
    .exec(`oc get deployment gen-ai-ui -n ${applicationsNamespace} -o json`, {
      failOnNonZeroExit: false,
    })
    .then((result: CommandLineResult) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `Unable to read the gen-ai-ui deployment: ${result.stderr || result.stdout}`,
        );
      }

      const deployment = JSON.parse(result.stdout) as {
        spec?: {
          template?: {
            spec?: {
              containers?: Array<{
                name?: string;
                env?: Array<{ name?: string; value?: string }>;
              }>;
            };
          };
        };
      };
      const genAiContainer = deployment.spec?.template?.spec?.containers?.find(
        (container) => container.name === 'gen-ai-ui',
      );
      const image = genAiContainer?.env?.find(
        (env) => env.name === 'RELATED_IMAGE_POSTGRESQL_16_IMAGE',
      )?.value;

      if (!image) {
        throw new Error(
          'RELATED_IMAGE_POSTGRESQL_16_IMAGE is not configured on the gen-ai-ui deployment',
        );
      }

      cy.log(`Using the cluster-configured PostgreSQL image: ${image}`);
      return cy.wrap(image, { log: false });
    });
};

/**
 * Creates the external store infrastructure and registration ConfigMap before the Playground is
 * installed. The backing table is intentionally seeded later: LlamaStack creates that table when
 * it registers the configured store during OGX startup.
 */
export const provisionExternalVectorStoreFixture = (
  namespace: string,
  testData: ExternalVectorStoreTestData,
): void => {
  getClusterPostgreSQLImage().then((pgVectorImage) => {
    cy.fixture(PGVECTOR_RESOURCE_FIXTURE, 'utf8').then((template: string) => {
      const rendered = replaceFixturePlaceholders(template, {
        CREDENTIALS_SECRET_NAME: testData.provider.credentialsSecretName,
        DATABASE_NAME: testData.provider.database,
        DATABASE_PASSWORD: testData.provider.password,
        DATABASE_USER: testData.provider.user,
        EMBEDDING_DIMENSION: String(testData.vectorStore.embeddingDimension),
        EMBEDDING_MODEL: testData.vectorStore.embeddingModel,
        PGVECTOR_IMAGE: pgVectorImage,
        PROJECT_NAME: namespace,
        PROVIDER_ID: testData.provider.id,
        PROVIDER_TYPE: testData.provider.type,
        RESOURCE_NAME: testData.provider.resourceName,
        VECTOR_STORE_DESCRIPTION: testData.vectorStore.description,
        VECTOR_STORE_ID: testData.vectorStore.id,
        VECTOR_STORE_NAME: testData.vectorStore.name,
      });

      applyOpenShiftYaml(rendered, namespace).then((result) => {
        if (result.exitCode !== 0) {
          throw new Error(
            `Failed to provision external vector store fixture: ${result.stderr || result.stdout}`,
          );
        }
      });
    });
  });

  cy.step('Wait for the external vector database deployment to be available');
  cy.exec(
    `oc rollout status deployment/${testData.provider.resourceName} -n ${namespace} --timeout=180s`,
    { timeout: 190000 },
  );

  cy.step('Verify the vector extension is installed');
  cy.exec(
    `oc exec deployment/${testData.provider.resourceName} -n ${namespace} -- ` +
      `psql -U ${testData.provider.user} -d ${testData.provider.database} -tAc ` +
      `"SELECT extname FROM pg_extension WHERE extname = 'vector';"`,
  )
    .its('stdout')
    .invoke('trim')
    .should('eq', 'vector');
};

const requestEmbedding = (
  namespace: string,
  testData: ExternalVectorStoreTestData,
  attempt = 1,
  maxAttempts = 30,
): Cypress.Chainable<number[]> => {
  const requestBody = JSON.stringify({
    model: testData.vectorStore.embeddingModelId,
    input: [testData.seed.content],
  });
  const command =
    `oc exec deployment/${testData.llamaStack.deploymentName} -n ${namespace} -- ` +
    `curl -sf -X POST http://localhost:${LLAMA_STACK_PORT}/v1/embeddings ` +
    `-H 'Content-Type: application/json' -d '${escapeShellSingleQuotes(requestBody)}'`;

  return cy
    .exec(command, { failOnNonZeroExit: false, log: false, timeout: 30000 })
    .then((result: CommandLineResult): Cypress.Chainable<number[]> => {
      if (result.exitCode === 0) {
        try {
          const response = JSON.parse(result.stdout) as EmbeddingsResponse;
          const embedding = response.data?.[0]?.embedding;
          if (
            embedding?.length === testData.vectorStore.embeddingDimension &&
            embedding.every(Number.isFinite)
          ) {
            cy.log(
              `Generated ${embedding.length}-dimension fixture embedding ` +
                `(attempt ${attempt}/${maxAttempts})`,
            );
            return cy.wrap(embedding, { log: false });
          }
        } catch {
          // LlamaStack may return a transient non-JSON startup response; retry below.
        }
      }

      if (attempt >= maxAttempts) {
        throw new Error(
          `LlamaStack did not generate a ${testData.vectorStore.embeddingDimension}-dimension ` +
            `embedding after ${maxAttempts} attempts: ${result.stderr || result.stdout}`,
        );
      }

      cy.log(`Waiting for the embedding model (attempt ${attempt}/${maxAttempts})`);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy
        .wait(5000)
        .then(() => requestEmbedding(namespace, testData, attempt + 1, maxAttempts));
    });
};

/**
 * Waits for the exact provider table created by LlamaStack, inserts deterministic fixture data,
 * and verifies the row. This is PGVector-specific setup; the Cypress scenario itself only asserts
 * the provider-neutral product contract.
 */
export const seedExternalVectorStoreFixture = (
  namespace: string,
  testData: ExternalVectorStoreTestData,
): void => {
  const tableName = getPgVectorTableName(testData.vectorStore.id);
  const psql =
    `oc exec -i deployment/${testData.provider.resourceName} -n ${namespace} -- ` +
    `psql -U ${testData.provider.user} -d ${testData.provider.database}`;

  cy.step(`Wait for LlamaStack to create ${tableName}`);
  pollUntilSuccess(
    `${psql} -tAc "SELECT to_regclass('public.${tableName}') IS NOT NULL;" | grep -qx t`,
    `PGVector table ${tableName}`,
    { maxAttempts: 60, pollIntervalMs: 3000 },
  );

  cy.step('Generate a real embedding through the configured LlamaStack provider');
  requestEmbedding(namespace, testData).then((embedding) => {
    const now = Math.floor(Date.now() / 1000);
    const tokenCount = testData.seed.content.split(/\s+/).length;
    /* eslint-disable camelcase -- matches LlamaStack's EmbeddedChunk document schema */
    const document = {
      content: testData.seed.content,
      chunk_id: testData.seed.id,
      metadata: {
        file_id: testData.seed.fileId,
        chunk_id: testData.seed.id,
        filename: testData.seed.fileName,
        document_id: testData.seed.fileId,
        token_count: tokenCount,
        chunk_tokenizer: 'tiktoken:cl100k_base',
        metadata_token_count: 10,
      },
      chunk_metadata: {
        source: null,
        chunk_id: testData.seed.id,
        document_id: testData.seed.fileId,
        chunk_window: `0-${tokenCount}`,
        chunk_tokenizer: 'tiktoken:cl100k_base',
        created_timestamp: now,
        updated_timestamp: now,
        content_token_count: tokenCount,
        metadata_token_count: 10,
      },
      embedding_model: testData.vectorStore.embeddingModel,
      embedding_dimension: testData.vectorStore.embeddingDimension,
    };
    /* eslint-enable camelcase */
    const content = escapeSqlLiteral(testData.seed.content);
    const documentJson = escapeSqlLiteral(JSON.stringify(document));
    const vector = `[${embedding.join(',')}]`;
    const sql = `
INSERT INTO ${tableName} (id, document, embedding, content_text, tokenized_content)
VALUES (
  '${escapeSqlLiteral(testData.seed.id)}',
  '${documentJson}'::jsonb,
  '${vector}'::vector,
  '${content}',
  to_tsvector('english', '${content}')
)
ON CONFLICT (id) DO UPDATE SET
  document = EXCLUDED.document,
  embedding = EXCLUDED.embedding,
  content_text = EXCLUDED.content_text,
  tokenized_content = EXCLUDED.tokenized_content;
`;
    const sqlFile = `/tmp/external-vector-store-seed-${Date.now()}.sql`;

    cy.step('Upsert deterministic external vector store test data');
    cy.writeFile(sqlFile, sql, { log: false }).then(() =>
      cy.exec(
        `${psql} -v ON_ERROR_STOP=1 < ${sqlFile}; seed_result=$?; ` +
          `rm -f -- ${sqlFile}; exit $seed_result`,
        { log: false, timeout: 60000 },
      ),
    );

    cy.step('Verify the seeded vector store row');
    cy.exec(
      `${psql} -tAc "SELECT COUNT(*) FROM ${tableName} ` +
        `WHERE id = '${escapeSqlLiteral(testData.seed.id)}' ` +
        `AND content_text = '${content}';"`,
    )
      .its('stdout')
      .invoke('trim')
      .should('eq', '1');
  });
};

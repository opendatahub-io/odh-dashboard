import * as z from 'zod';

const requiredText = z.preprocess(
  (value: unknown) => (value === undefined ? '' : value),
  z.string().trim().min(1, 'This field is required'),
);
const requiredCredential = z.preprocess(
  (value: unknown) => (value === undefined ? '' : value),
  z.string().refine((value) => value.trim() !== '', 'This field is required'),
);
const optionalCredential = z.preprocess(
  (value: unknown) => (value === undefined || value === '' ? undefined : value),
  z
    .string()
    .refine((value) => value.trim() !== '', 'Token cannot be blank when provided')
    .optional(),
);
const requiredPort = z.preprocess(
  (value: unknown) => (value === undefined ? '' : value),
  z
    .string()
    .trim()
    .min(1, 'This field is required')
    .regex(/^\d+$/, 'Enter an integer port from 1 to 65535.')
    .refine((value) => Number(value) >= 1 && Number(value) <= 65535, {
      message: 'Enter an integer port from 1 to 65535.',
    }),
);
const optionalText = z.preprocess(
  (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().optional(),
);
const optionalCa = z.preprocess(
  (value: unknown) => (value === '' ? undefined : value),
  z.string().trim().min(1, 'CA certificate cannot be blank').optional(),
);

const isIpv4Address = (value: string): boolean => {
  const parts = value.split('.');
  return (
    parts.length <= 4 && parts.every((part) => /^\d+$/.test(part) || /^0x[0-9a-f]+$/i.test(part))
  );
};

const pgVectorHost = requiredText.refine((value) => {
  const normalizedHost = value.endsWith('.') ? value.slice(0, -1) : value;
  return (
    normalizedHost.length <= 253 &&
    normalizedHost.toLowerCase() !== 'localhost' &&
    !isIpv4Address(normalizedHost) &&
    normalizedHost
      .split('.')
      .every((label) => /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label))
  );
}, 'Enter a valid DNS hostname. Literal IP addresses are not supported.');

const uriWithProtocols = (protocols: string[], message: string) =>
  requiredText.refine((value) => {
    try {
      const parsed = new URL(value);
      return protocols.includes(parsed.protocol) && Boolean(parsed.hostname);
    } catch {
      return false;
    }
  }, message);

const milvusUri = uriWithProtocols(
  ['http:', 'https:'],
  'Enter a valid HTTP or HTTPS URI with a hostname.',
);
const neo4jUri = uriWithProtocols(
  ['neo4j:', 'neo4j+s:', 'bolt:', 'bolt+s:'],
  'Enter a valid neo4j://, neo4j+s://, bolt://, or bolt+s:// URI with a hostname.',
);
export const vectorDbConnectionSchemas = {
  milvus: z.object({
    MILVUS_URI: milvusUri,
    MILVUS_TOKEN: optionalCredential,
    MILVUS_CA_CERT: optionalCa,
  }),
  pgvector: z.object({
    PGVECTOR_HOST: pgVectorHost,
    PGVECTOR_PORT: requiredPort,
    PGVECTOR_DB: requiredText,
    PGVECTOR_USER: requiredText,
    PGVECTOR_PASSWORD: requiredCredential,
    PGVECTOR_CA_CERT: optionalCa,
  }),
  neo4j: z.object({
    NEO4J_URI: neo4jUri,
    NEO4J_USERNAME: optionalText,
    NEO4J_PASSWORD: requiredCredential,
    NEO4J_DATABASE: optionalText,
    NEO4J_CA_CERT: optionalCa,
  }),
} as const;

export type VectorDbProvider = keyof typeof vectorDbConnectionSchemas;
export type VectorDbConnectionFields = Partial<Record<string, string>>;
export type VectorDbConnectionParseResult =
  | ReturnType<typeof vectorDbConnectionSchemas.milvus.safeParse>
  | ReturnType<typeof vectorDbConnectionSchemas.pgvector.safeParse>
  | ReturnType<typeof vectorDbConnectionSchemas.neo4j.safeParse>;

export const parseVectorDbConnection = (
  provider: VectorDbProvider,
  fields: VectorDbConnectionFields,
): VectorDbConnectionParseResult => vectorDbConnectionSchemas[provider].safeParse(fields);

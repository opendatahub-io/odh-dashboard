import yaml from 'js-yaml';
import type { Collection } from '~/app/types';

// The platform ceiling for ConfigMaps and Secrets, which is where the EvalHub
// server materializes collections.
export const IMPORT_FILE_SIZE_LIMIT = 1024 * 1024; // 1 MiB

export const IMPORT_FILE_EXTENSIONS = ['.yaml', '.yml', '.json'];

// Writable collection fields per the server's CollectionConfig schema.
const KNOWN_COLLECTION_FIELDS = new Set([
  'name',
  'category',
  'description',
  'tags',
  'custom',
  'pass_criteria',
  'benchmarks',
  'domains',
  'tasks',
  'modalities',
  'industries',
  'evaluation_targets',
  'agent',
]);

// Collection fields the server sets itself; they are ignored on import.
const SERVER_MANAGED_COLLECTION_FIELDS = new Set([
  'id',
  'curation_order',
  'derived_from',
  'pinned_order',
  'resource',
  'status',
  'url',
]);

// Writable benchmark fields per the server's CollectionBenchmarkConfig schema.
const KNOWN_BENCHMARK_FIELDS = new Set([
  'id',
  'provider_id',
  'weight',
  'primary_score',
  'pass_criteria',
  'parameters',
  'test_data_ref',
]);

// Benchmark fields the server derives from the provider definition.
const SERVER_MANAGED_BENCHMARK_FIELDS = new Set(['url']);

export const IMPORT_COLLECTION_TEMPLATE = `name: my-collection
description: >
  A short description of what this collection evaluates.
domains:
  - knowledge_and_reasoning
benchmarks:
  - id: arc_easy
    provider_id: lm_evaluation_harness
    weight: 1.0
    primary_score:
      metric: acc_norm
      lower_is_better: false
    pass_criteria:
      threshold: 0.25
`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export type ParsedImportContent = {
  doc: Record<string, unknown> | null;
  error?: string;
  /** 1-based source line of a YAML syntax error, for editor highlighting. */
  errorLine?: number;
  documentCount: number;
};

/** Returns an error message when the file fails the size or extension checks. */
export const validateImportFile = (file: File): string | null => {
  if (file.size > IMPORT_FILE_SIZE_LIMIT) {
    return 'File exceeds the 1 MiB size limit';
  }
  const lowerName = file.name.toLowerCase();
  if (!IMPORT_FILE_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return 'Unsupported file type. Use a .yaml, .yml, or .json file';
  }
  return null;
};

/**
 * Reads the file as UTF-8 text. A file saved in another encoding (for
 * example UTF-16) decodes to replacement characters, which is reported as
 * an encoding error before any parsing happens.
 */
export const readFileAsUTF8Text = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (text.includes('�')) {
        reject(
          new Error(
            'File does not appear to be UTF-8 encoded. Please save the file as UTF-8 and try again.',
          ),
        );
        return;
      }
      resolve(text);
    };
    reader.readAsText(file, 'utf-8');
  });

/**
 * Parses raw collection-definition content (YAML or JSON, detected by a
 * leading '{' or '[') into a document. js-yaml's loadAll uses safe-load
 * semantics, so custom tags are rejected. YAML syntax errors surface the
 * line number. Only the first document of a multi-document file is
 * imported; the document count lets the caller inform the user.
 */
export const parseImportContent = (text: string): ParsedImportContent => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { doc: null, documentCount: 0, error: 'No collection definition found in file' };
  }

  let documents: unknown[];
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      documents = [JSON.parse(trimmed)];
    } catch (e) {
      return { doc: null, documentCount: 0, error: `Invalid JSON: ${toErrorMessage(e)}` };
    }
  } else {
    try {
      documents = yaml.loadAll(trimmed);
    } catch (e) {
      if (e instanceof yaml.YAMLException) {
        // js-yaml reports positions relative to the trimmed input; rebase
        // onto the editor's absolute line numbers.
        const leadingBlankLines =
          text.slice(0, text.length - trimmed.length).split('\n').length - 1;
        const errorLine = e.mark.line + 1 + leadingBlankLines;
        return {
          doc: null,
          documentCount: 0,
          errorLine,
          error: `Invalid YAML at line ${errorLine}: ${e.reason}`,
        };
      }
      return { doc: null, documentCount: 0, error: `Invalid YAML: ${toErrorMessage(e)}` };
    }
  }

  const nonNull = documents.filter((document) => document != null);
  if (nonNull.length === 0) {
    return { doc: null, documentCount: 0, error: 'No collection definition found in file' };
  }
  const first = nonNull[0];
  if (!isRecord(first)) {
    return {
      doc: null,
      documentCount: nonNull.length,
      error: 'Collection definition must be an object',
    };
  }
  return { doc: first, documentCount: nonNull.length };
};

/**
 * Advisory warnings shown before the user confirms the import — a
 * client-side mirror of the BFF's pre-submission checks. The server's
 * validation on submission is authoritative.
 */
export const getImportWarnings = (doc: Record<string, unknown>): string[] => {
  const warnings: string[] = [];
  Object.keys(doc)
    .toSorted()
    .forEach((field) => {
      if (SERVER_MANAGED_COLLECTION_FIELDS.has(field)) {
        warnings.push(`Field "${field}" is managed by the server and will be ignored.`);
      } else if (!KNOWN_COLLECTION_FIELDS.has(field)) {
        warnings.push(`Unrecognized field "${field}" will be ignored.`);
      }
    });
  if (typeof doc.description !== 'string' || doc.description.trim() === '') {
    warnings.push(
      'No description provided. Consider adding one so the collection is easy to identify.',
    );
  }
  const benchmarks = Array.isArray(doc.benchmarks) ? doc.benchmarks : [];
  benchmarks.forEach((entry, index) => {
    if (!isRecord(entry)) {
      return;
    }
    const id = typeof entry.id === 'string' && entry.id !== '' ? entry.id : `at index ${index}`;
    Object.keys(entry)
      .toSorted()
      .forEach((field) => {
        if (SERVER_MANAGED_BENCHMARK_FIELDS.has(field)) {
          warnings.push(
            `Benchmark "${id}": field "${field}" is managed by the server and will be ignored.`,
          );
        } else if (!KNOWN_BENCHMARK_FIELDS.has(field)) {
          warnings.push(`Benchmark "${id}": unrecognized field "${field}" will be ignored.`);
        }
      });
  });
  return warnings;
};

/** Case-insensitive match against the collections visible to the user. */
export const findNameCollision = (
  name: string,
  collections: Collection[],
): Collection | undefined =>
  collections.find(
    (collection) => collection.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );

/**
 * Proposes a unique collection name: the original when it is already unique,
 * otherwise a date suffix first, then an incrementing counter.
 */
export const proposeUniqueName = (name: string, collections: Collection[]): string => {
  const existing = new Set(
    collections
      .map((collection) => collection.name.trim().toLowerCase())
      .filter((candidate) => candidate !== ''),
  );
  const base = name.trim();
  if (!existing.has(base.toLowerCase())) {
    return base;
  }
  const dated = `${base}-${new Date().toISOString().slice(0, 10)}`;
  if (!existing.has(dated.toLowerCase())) {
    return dated;
  }
  let counter = 1;
  while (existing.has(`${dated}-${counter}`.toLowerCase())) {
    counter++;
  }
  return `${dated}-${counter}`;
};

/**
 * Replaces the top-level name in the raw content so the editor text stays
 * the single source of truth. JSON content is re-serialized; YAML replaces
 * the unindented `name:` line.
 */
export const applyImportName = (text: string, newName: string): string => {
  const trimmed = text.trimStart();
  if (trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isRecord(parsed)) {
        parsed.name = newName;
        return JSON.stringify(parsed, null, 2);
      }
    } catch {
      // Fall through to the line replacement below.
    }
  }
  if (/^name:[ \t]*.*$/m.test(text)) {
    return text.replace(/^name:[ \t]*.*$/m, `name: ${newName}`);
  }
  return text;
};

/**
 * Best-effort detection of a name-collision failure from the server (the
 * collections API has no dedicated conflict status), used to offer a rename
 * and retry without losing the edited content.
 */
export const isNameConflictError = (message: string): boolean =>
  /name/i.test(message) && /(exist|conflict|duplicate|already|taken)/i.test(message);

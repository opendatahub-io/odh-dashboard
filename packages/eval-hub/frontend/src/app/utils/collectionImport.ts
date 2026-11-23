import yaml from 'js-yaml';
import isEqual from 'lodash-es/isEqual';
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

export const IMPORT_COLLECTION_TEMPLATE = `# Example collection format

name: my-collection
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

export type ImportLanguage = 'json' | 'yaml';

/**
 * JSON is recognized by a leading object/array brace; everything else is
 * treated as YAML. Kept in sync with the parser's own branch so the editor
 * label matches how the content is interpreted.
 */
export const detectImportLanguage = (text: string): ImportLanguage => {
  const trimmed = text.trimStart();
  return trimmed.startsWith('{') || trimmed.startsWith('[') ? 'json' : 'yaml';
};

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

type DocumentsParseResult = { documents: unknown[] } | { error: string; errorLine?: number };

const parseYamlDocuments = (text: string, trimmed: string): DocumentsParseResult => {
  try {
    return { documents: yaml.loadAll(trimmed) };
  } catch (e) {
    if (e instanceof yaml.YAMLException) {
      // js-yaml reports positions relative to the trimmed input; rebase
      // onto the editor's absolute line numbers using the leading blank
      // block only (trailing blanks do not shift content lines).
      const leadingBlankLines =
        text.slice(0, text.length - text.trimStart().length).split('\n').length - 1;
      const errorLine = e.mark.line + 1 + leadingBlankLines;
      return { error: `Invalid YAML at line ${errorLine}: ${e.reason}`, errorLine };
    }
    return { error: `Invalid YAML: ${toErrorMessage(e)}` };
  }
};

/**
 * Parses raw collection-definition content (YAML or JSON, detected by a
 * leading '{' or '[') into a document. Content that leads with a brace but
 * fails strict JSON parsing falls back to the YAML parser, so YAML flow
 * mappings with unquoted keys ({name: x}) are recovered; valid JSON never
 * falls through, keeping the strict JSON path's exact large-integer
 * handling. js-yaml's loadAll uses safe-load semantics, so custom tags are
 * rejected. YAML syntax errors surface the line number. Only the first
 * document of a multi-document file is imported; the document count lets
 * the caller inform the user.
 */
export const parseImportContent = (text: string): ParsedImportContent => {
  if (text.length > IMPORT_FILE_SIZE_LIMIT) {
    return { doc: null, documentCount: 0, error: 'Content exceeds the 1 MiB size limit' };
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return { doc: null, documentCount: 0, error: 'No collection definition found in file' };
  }

  const parseDocuments = (): DocumentsParseResult => {
    if (detectImportLanguage(text) === 'json') {
      try {
        return { documents: [JSON.parse(trimmed)] };
      } catch (e) {
        const recovered = parseYamlDocuments(text, trimmed);
        if ('documents' in recovered) {
          return recovered;
        }
        // Neither parser accepted the content; the JSON error is the more
        // familiar message for brace-leading input.
        return { error: `Invalid JSON: ${toErrorMessage(e)}` };
      }
    }
    return parseYamlDocuments(text, trimmed);
  };
  const parsed = parseDocuments();
  if (!('documents' in parsed)) {
    return { doc: null, documentCount: 0, errorLine: parsed.errorLine, error: parsed.error };
  }
  const { documents } = parsed;

  // The BFF imports the literal first document, so the preview must validate
  // documents[0] (not the first non-null document) and count the raw stream.
  if (documents.length === 0 || documents[0] == null) {
    return {
      doc: null,
      documentCount: documents.length,
      error: 'No collection definition found in file',
    };
  }
  const first = documents[0];
  if (!isRecord(first)) {
    return {
      doc: null,
      documentCount: documents.length,
      error: 'Collection definition must be an object',
    };
  }
  return { doc: first, documentCount: documents.length };
};

const DEFAULT_TEMPLATE_DOC: Record<string, unknown> | null = parseImportContent(
  IMPORT_COLLECTION_TEMPLATE,
).doc;

/**
 * True when the definition is semantically identical to the sample template
 * the modal opens with. Importing it as-is would create a placeholder
 * collection, so the modal blocks submission until it is edited.
 */
export const isUnmodifiedTemplate = (doc: Record<string, unknown>): boolean =>
  DEFAULT_TEMPLATE_DOC !== null && isEqual(doc, DEFAULT_TEMPLATE_DOC);

export type ImportWarning = {
  message: string;
  /** Top-level collection field the warning points at, when it has one. */
  field?: string;
  /** Benchmark entry the warning points at, when it is benchmark-scoped. */
  benchmarkId?: string;
  /** Field within the benchmark entry, when it has one. */
  benchmarkField?: string;
};

/**
 * Advisory warnings shown before the user confirms the import — a
 * client-side mirror of the BFF's pre-submission checks. The server's
 * validation on submission is authoritative. Each warning carries the
 * anchors needed to point an editor marker at its source line.
 */
export const getImportWarnings = (doc: Record<string, unknown>): ImportWarning[] => {
  const warnings: ImportWarning[] = [];
  Object.keys(doc)
    .toSorted()
    .forEach((field) => {
      if (SERVER_MANAGED_COLLECTION_FIELDS.has(field)) {
        warnings.push({
          message: `Field "${field}" is managed by the server and will be ignored.`,
          field,
        });
      } else if (!KNOWN_COLLECTION_FIELDS.has(field)) {
        warnings.push({ message: `Unrecognized field "${field}" will be ignored.`, field });
      }
    });
  if (typeof doc.description !== 'string' || doc.description.trim() === '') {
    warnings.push({
      message:
        'No description provided. Consider adding one so the collection is easy to identify.',
    });
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
          warnings.push({
            message: `Benchmark "${id}": field "${field}" is managed by the server and will be ignored.`,
            benchmarkId: id,
            benchmarkField: field,
          });
        } else if (!KNOWN_BENCHMARK_FIELDS.has(field)) {
          warnings.push({
            message: `Benchmark "${id}": unrecognized field "${field}" will be ignored.`,
            benchmarkId: id,
            benchmarkField: field,
          });
        }
      });
  });
  return warnings;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Resolves the 1-based line a warning anchors to in the raw content: the
 * warning field's own line when present, the field's line within its
 * benchmark entry for benchmark-scoped warnings, the benchmark's id line
 * when only the entry is known, and line 1 for file-level warnings.
 */
export const findImportWarningLine = (text: string, warning: ImportWarning): number => {
  const lines = text.split('\n');
  if (warning.benchmarkId !== undefined) {
    const benchmarkPattern = new RegExp(
      `^\\s*-\\s*id:\\s*['"]?${escapeRegExp(warning.benchmarkId)}['"]?\\s*$`,
    );
    const benchmarkLine = lines.findIndex((line) => benchmarkPattern.test(line));
    if (benchmarkLine === -1) {
      return 1;
    }
    if (warning.benchmarkField !== undefined) {
      const fieldPattern = new RegExp(`^\\s+${escapeRegExp(warning.benchmarkField)}:`);
      for (let index = benchmarkLine + 1; index < lines.length; index++) {
        const line = lines[index];
        // Stop at the next benchmark entry or at a top-level key.
        if (/^\S/.test(line) || /^\s*-\s/.test(line)) {
          break;
        }
        if (fieldPattern.test(line)) {
          return index + 1;
        }
      }
    }
    return benchmarkLine + 1;
  }
  if (warning.field !== undefined) {
    const fieldLine = lines.findIndex((line) => line.startsWith(`${warning.field}:`));
    if (fieldLine !== -1) {
      return fieldLine + 1;
    }
  }
  return 1;
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

/** Serializes a value as a single YAML scalar, quoting it when needed. */
const serializeYamlScalar = (value: string): string =>
  yaml.dump(value, { lineWidth: -1 }).trimEnd();

/**
 * End of the value that starts at start within a brace-delimited mapping.
 * Unlike strict JSON, YAML flow scalars may contain spaces, so the value
 * ends at the next ',' or closing bracket at the value's own nesting depth
 * (quoted strings and nested collections are skipped), not at whitespace.
 * A zero-width result means the value slot is empty (YAML null).
 */
const findFlowValueEnd = (text: string, start: number): number => {
  const len = text.length;
  let depth = 0;
  let i = start;
  while (i < len) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      i++;
      while (i < len) {
        if (ch === '"' && text[i] === '\\') {
          i += 2;
          continue;
        }
        if (text[i] === ch) {
          break;
        }
        i++;
      }
      if (i >= len) {
        return -1;
      }
      i++;
      continue;
    }
    if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      if (depth === 0) {
        return i;
      }
      depth--;
    } else if (ch === ',' && depth === 0) {
      return i;
    }
    i++;
  }
  return -1;
};

/**
 * Replaces (or inserts) the top-level "name" value directly in the raw text
 * of a leading brace-delimited mapping — strict JSON or YAML flow style —
 * rather than re-serializing the document, so values that do not survive a
 * parse/stringify round-trip — integers beyond the safe range, number
 * formatting, key order — are preserved verbatim. Quoted (JSON) and
 * unquoted (YAML flow) top-level name keys are both recognized. Returns
 * null when the text is not a brace-delimited mapping, so the caller can
 * fall back to the YAML block path.
 */
const replaceTopLevelJsonName = (text: string, newName: string): string | null => {
  const len = text.length;
  let i = 0;
  while (i < len && /\s/.test(text[i])) {
    i++;
  }
  if (text[i] !== '{') {
    return null;
  }
  const objectStart = i;
  const serialized = JSON.stringify(newName);

  // Replaces the value between valueStart (inclusive) and valueEnd
  // (exclusive); a zero-width span inserts into an empty value slot.
  const replaceValue = (valueStart: number, valueEnd: number): string =>
    text.slice(0, valueStart) + serialized + text.slice(valueEnd);

  const replaceNameValue = (colonIndex: number): string | null => {
    let valueStart = colonIndex + 1;
    while (valueStart < len && /\s/.test(text[valueStart])) {
      valueStart++;
    }
    const valueEnd = findFlowValueEnd(text, valueStart);
    if (valueEnd === -1) {
      return null;
    }
    return replaceValue(valueStart, valueEnd);
  };

  let depth = 1;
  i++;
  while (i < len) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      // Quoted key or string value: scan to its close first.
      let end = i + 1;
      while (end < len) {
        if (ch === '"' && text[end] === '\\') {
          end += 2;
          continue;
        }
        if (text[end] === ch) {
          break;
        }
        end++;
      }
      if (end >= len) {
        return null;
      }
      const isNameKey = depth === 1 && text.slice(i + 1, end) === 'name';
      end++;
      let after = end;
      while (after < len && /\s/.test(text[after])) {
        after++;
      }
      if (isNameKey && text[after] === ':') {
        return replaceNameValue(after);
      }
      i = end;
      continue;
    }
    if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
    } else if (depth === 1 && !/[\s:,]/.test(ch)) {
      // Unquoted (YAML flow) key token.
      let end = i;
      while (end < len && !/[\s:,[\]{}]/.test(text[end])) {
        end++;
      }
      if (text.slice(i, end) === 'name') {
        let after = end;
        while (after < len && /\s/.test(text[after])) {
          after++;
        }
        if (text[after] === ':') {
          return replaceNameValue(after);
        }
      }
      i = end;
      continue;
    }
    i++;
  }

  // No top-level name key: insert one directly after the opening brace.
  const rest = text.slice(objectStart + 1);
  const body = rest.trim();
  const separator = body === '' || body.startsWith('}') ? '' : ',';
  return `${text.slice(0, objectStart + 1)}"name": ${serialized}${separator}${rest}`;
};

/**
 * Replaces the top-level name in the raw content so the editor text stays
 * the single source of truth. JSON content has only the name value replaced
 * in place; YAML replaces the complete `name:` entry (its line plus any
 * indented continuation lines of a multi-line value), or inserts one after
 * any leading comment, blank block, or document marker (---) when the
 * definition has no name yet — inserting before the marker would create a
 * name-only first document and hide the rest of the definition from the
 * import, which reads only documents[0].
 */
export const applyImportName = (text: string, newName: string): string => {
  const trimmed = text.trimStart();
  if (trimmed.startsWith('{')) {
    const replaced = replaceTopLevelJsonName(trimmed, newName);
    if (replaced !== null) {
      return replaced;
    }
  }
  const serialized = serializeYamlScalar(newName);
  // Matches plain, quoted, and space-padded-colon forms of a top-level name
  // key ("name", 'name', name :); the backreference pairs the quote.
  const nameMatch = /^(["']?)name\1[ \t]*:.*$/m.exec(text);
  if (nameMatch !== null) {
    // Replace the whole entry: the name line plus any indented continuation
    // lines of a multi-line YAML value, and blank lines between them.
    const lines = text.split('\n');
    const nameIndex = text.slice(0, nameMatch.index).split('\n').length - 1;
    let end = nameIndex + 1;
    while (end < lines.length) {
      const line = lines[end];
      if (/^[ \t]+\S/.test(line)) {
        end += 1;
        continue;
      }
      // A blank line only continues the entry when a further indented line
      // follows; otherwise it separates the name from the remaining fields.
      if (line.trim() === '') {
        let next = end + 1;
        while (next < lines.length && lines[next].trim() === '') {
          next += 1;
        }
        if (next < lines.length && /^[ \t]+\S/.test(lines[next])) {
          end = next;
          continue;
        }
      }
      break;
    }
    lines.splice(nameIndex, end - nameIndex, `name: ${serialized}`);
    return lines.join('\n');
  }
  if (newName.trim() === '') {
    return text;
  }
  if (text.trim() === '') {
    return `name: ${serialized}\n`;
  }
  const lines = text.split('\n');
  let insertIndex = 0;
  while (insertIndex < lines.length) {
    const line = lines[insertIndex];
    if (/^\s*$/.test(line) || /^#/.test(line) || /^---\s*$/.test(line)) {
      insertIndex += 1;
      continue;
    }
    break;
  }
  lines.splice(insertIndex, 0, `name: ${serialized}`);
  return lines.join('\n');
};

/**
 * Best-effort detection of a name-collision failure from the server (the
 * collections API has no dedicated conflict status), used to offer a rename
 * and retry without losing the edited content.
 */
export const isNameConflictError = (message: string): boolean =>
  /name/i.test(message) && /(exist|conflict|duplicate|already|taken)/i.test(message);

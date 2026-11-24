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

// A definition below the 1 MiB limit can still carry tens of thousands of
// unknown fields, each producing an advisory warning. The cap bounds the
// warnings surfaced (and line-resolved) per edit; the rest are summarized
// in one final warning so the diagnostic pass stays linear in input size.
const MAX_IMPORT_WARNINGS = 100;

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
 * treated as YAML. Mirrors the parser's own branch in parseImportContent;
 * the editor label follows the parser's reported language instead, so
 * brace-leading content recovered through the YAML fallback is labeled
 * YAML.
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
  /**
   * The parser that accepted the content — 'json' for strict JSON, 'yaml'
   * otherwise. Undefined when parsing failed, so callers fall back to
   * detectImportLanguage.
   */
  language?: ImportLanguage;
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
 * Reads the file as UTF-8 text, strictly: bytes that are not valid UTF-8 —
 * including a UTF-16 file, recognized by its BOM — are reported as an
 * encoding error before any parsing happens. A file that legitimately
 * contains a literal replacement character is accepted.
 */
export const readFileAsUTF8Text = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error('Failed to read file'));
        return;
      }
      const bytes = new Uint8Array(reader.result);
      // A UTF-16 BOM would otherwise decode to NUL-interleaved garbage.
      if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)) {
        reject(
          new Error(
            'File appears to be UTF-16 encoded. Please save the file as UTF-8 and try again.',
          ),
        );
        return;
      }
      try {
        resolve(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      } catch {
        reject(
          new Error(
            'File does not appear to be UTF-8 encoded. Please save the file as UTF-8 and try again.',
          ),
        );
      }
    };
    reader.readAsArrayBuffer(file);
  });

type DocumentsParseResult =
  { documents: unknown[]; language: ImportLanguage } | { error: string; errorLine?: number };

const parseYamlDocuments = (text: string): DocumentsParseResult => {
  try {
    return { documents: yaml.loadAll(text), language: 'yaml' };
  } catch (e) {
    if (e instanceof yaml.YAMLException) {
      const errorLine = e.mark.line + 1;
      return { error: `Invalid YAML at line ${errorLine}: ${e.reason}`, errorLine };
    }
    return { error: `Invalid YAML: ${toErrorMessage(e)}` };
  }
};

/**
 * True when the content's UTF-8 byte length exceeds the import limit.
 * text.length counts UTF-16 code units, which underestimates non-ASCII
 * content; the BFF checks bytes, so the client must too. Exits early once
 * the limit is passed.
 */
const exceedsUTF8ByteLimit = (text: string): boolean => {
  let bytes = 0;
  for (let offset = 0; offset < text.length; offset++) {
    const code = text.charCodeAt(offset);
    if (code >= 0xd800 && code <= 0xdbff) {
      // Surrogate pair (or lone surrogate): worst-case four bytes.
      bytes += 4;
      offset += 1;
    } else {
      bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
    }
    if (bytes > IMPORT_FILE_SIZE_LIMIT) {
      return true;
    }
  }
  return false;
};

/**
 * Parses raw collection-definition content (YAML or JSON, detected by a
 * leading '{' or '[') into a document. The original, untrimmed text is
 * parsed so an intentionally indented document behaves exactly as it does
 * in the BFF, which also parses the raw content. Content that leads with a
 * brace but fails strict JSON parsing falls back to the YAML parser, so
 * YAML flow mappings with unquoted keys ({name: x}) are recovered; valid
 * JSON never falls through, keeping the strict JSON path's exact
 * large-integer handling. js-yaml's loadAll uses safe-load semantics, so
 * custom tags are rejected. YAML syntax errors surface the line number.
 * Only the first document of a multi-document file is imported; the
 * document count lets the caller inform the user. The returned language
 * records which parser accepted the content.
 */
export const parseImportContent = (text: string): ParsedImportContent => {
  if (exceedsUTF8ByteLimit(text)) {
    return { doc: null, documentCount: 0, error: 'Content exceeds the 1 MiB size limit' };
  }
  if (text.trim() === '') {
    return { doc: null, documentCount: 0, error: 'No collection definition found in file' };
  }

  const parseDocuments = (): DocumentsParseResult => {
    if (detectImportLanguage(text) === 'json') {
      try {
        return { documents: [JSON.parse(text)], language: 'json' };
      } catch (e) {
        const recovered = parseYamlDocuments(text);
        if ('documents' in recovered) {
          return recovered;
        }
        // Neither parser accepted the content; the JSON error is the more
        // familiar message for brace-leading input.
        return { error: `Invalid JSON: ${toErrorMessage(e)}` };
      }
    }
    return parseYamlDocuments(text);
  };
  const parsed = parseDocuments();
  if (!('documents' in parsed)) {
    return { doc: null, documentCount: 0, errorLine: parsed.errorLine, error: parsed.error };
  }
  const { documents, language } = parsed;

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
  return { doc: first, documentCount: documents.length, language };
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
 * anchors needed to point an editor marker at its source line. At most
 * MAX_IMPORT_WARNINGS warnings are returned; the rest are summarized in
 * one final anchor-less warning so the diagnostics rendered per edit stay
 * bounded no matter how many unknown fields the definition carries.
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
  if (warnings.length > MAX_IMPORT_WARNINGS) {
    const hidden = warnings.length - MAX_IMPORT_WARNINGS;
    warnings.length = MAX_IMPORT_WARNINGS;
    warnings.push({ message: `${hidden} more warnings are not shown.` });
  }
  return warnings;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * True when the quoted key spanning [start, end] (the opening and closing
 * quote indices, inclusive) decodes to "name". Double-quoted JSON keys are
 * decoded first so escaped spellings of the key are recognized;
 * single-quoted YAML keys have no escape sequences and compare raw.
 */
const isNameKeyToken = (text: string, start: number, end: number): boolean => {
  if (text[start] === "'") {
    return text.slice(start + 1, end) === 'name';
  }
  try {
    return JSON.parse(text.slice(start, end + 1)) === 'name';
  } catch {
    return false;
  }
};

/**
 * Spellings of a warning anchor as its key or id can appear in the source:
 * bare, or wrapped in an optional leading and/or trailing quote character —
 * independently, matching the optional quotes in the anchor lookup forms.
 */
const anchorQuoteVariants = (value: string): string[] => [
  value,
  `"${value}"`,
  `'${value}'`,
  `"${value}`,
  `'${value}`,
  `${value}"`,
  `${value}'`,
  `"${value}'`,
  `'${value}"`,
];

/**
 * Colon positions considered per line when indexing key prefixes. Real
 * mapping keys hold at most a few colons; the cap keeps a minified
 * single-line document — whose prefix candidates all start with the
 * document's opening brace and can never equal a key — from producing
 * unbounded prefix work.
 */
const MAX_LINE_KEY_COLONS = 64;

/**
 * Line kinds that end a benchmark entry: a column-zero character (a
 * top-level key), a sequence item (the next benchmark entry), or the
 * closing bracket of a pretty-printed JSON entry.
 */
const isBenchmarkEntryBoundary = (line: string): boolean =>
  /^\S/.test(line) || /^\s*-\s/.test(line) || /^\s*[}\]],?\s*$/.test(line);

type ImportWarningLineIndex = {
  /** First line (0-based) whose text before a colon is exactly the key. */
  plainKeyLines: Map<string, number>;
  /** Line (0-based) of the shallowest-indented quoted occurrence per key. */
  quotedKeyLines: Map<string, number>;
  /** Indentation width of that occurrence, to compare shallowness. */
  quotedKeyIndents: Map<string, number>;
  /** First id line (0-based) per verbatim benchmark id text. */
  benchmarkIdLines: Map<string, number>;
  /** Field line (0-based) per verbatim field text, per entry id line. */
  benchmarkEntryFields: Map<number, Map<string, number>>;
};

/**
 * Indexes the anchor locations warnings resolve against — plain and quoted
 * top-level keys, benchmark id lines, and each benchmark entry's field
 * lines — in a single pass over the split lines. Resolving a warning
 * through the index is a lookup; resolving it by scanning the lines is a
 * full-document pass, which is quadratic when a definition carries many
 * warnings.
 */
const buildImportWarningLineIndex = (lines: string[]): ImportWarningLineIndex => {
  const index: ImportWarningLineIndex = {
    plainKeyLines: new Map(),
    quotedKeyLines: new Map(),
    quotedKeyIndents: new Map(),
    benchmarkIdLines: new Map(),
    benchmarkEntryFields: new Map(),
  };
  // The benchmark entry whose fields subsequent lines belong to; null
  // outside any entry.
  let entryFields: Map<string, number> | null = null;
  lines.forEach((line, lineIndex) => {
    // Benchmark id lines: `- id: value` (value optionally quoted) in block
    // YAML, `"id": "value",` in pretty-printed JSON. Both are keyed by the
    // verbatim value text; lookups try the quote-wrapped spellings of the
    // parsed id.
    const yamlIdMatch = /^\s*-\s*id:\s*(.*?)\s*$/.exec(line);
    const jsonIdMatch = yamlIdMatch === null ? /^\s*"id"\s*:\s*"(.*)"\s*,?\s*$/.exec(line) : null;
    const idText = yamlIdMatch?.[1] ?? jsonIdMatch?.[1];
    let isIdLine = false;
    if (idText !== undefined) {
      isIdLine = true;
      if (!index.benchmarkIdLines.has(idText)) {
        index.benchmarkIdLines.set(idText, lineIndex);
      }
      entryFields = new Map();
      index.benchmarkEntryFields.set(lineIndex, entryFields);
    } else if (entryFields !== null && isBenchmarkEntryBoundary(line)) {
      entryFields = null;
    }
    // Top-level keys resolve against every line, including id and boundary
    // lines, exactly as a whole-document scan would.
    const indent = line.length - line.trimStart().length;
    // Entry fields: an indented, non-boundary line inside an entry. The
    // text between the line's indentation and a colon — trailing whitespace
    // stripped — is the optionally quote-wrapped field name.
    const activeEntryFields = !isIdLine && entryFields !== null && indent > 0 ? entryFields : null;
    let colons = 0;
    for (let colon = line.indexOf(':'); colon !== -1; colon = line.indexOf(':', colon + 1)) {
      const plainCandidate = line.slice(0, colon);
      if (!index.plainKeyLines.has(plainCandidate)) {
        index.plainKeyLines.set(plainCandidate, lineIndex);
      }
      if (activeEntryFields !== null) {
        const fieldCandidate = line.slice(indent, colon).trimEnd();
        if (!activeEntryFields.has(fieldCandidate)) {
          activeEntryFields.set(fieldCandidate, lineIndex);
        }
      }
      colons += 1;
      if (colons >= MAX_LINE_KEY_COLONS) {
        break;
      }
    }
    // Pretty-printed JSON (or quoted YAML) keys: "field"/'field' at some
    // indentation. Top-level keys sit at the shallowest indentation.
    const quotedMatch = /^(\s*)'([^']*)'\s*:/.exec(line) ?? /^(\s*)"([^"]*)"\s*:/.exec(line);
    if (quotedMatch !== null) {
      const [, quotedIndentText, quotedKey] = quotedMatch;
      const quotedIndent = quotedIndentText.length;
      const knownIndent = index.quotedKeyIndents.get(quotedKey);
      if (knownIndent === undefined || quotedIndent < knownIndent) {
        index.quotedKeyLines.set(quotedKey, lineIndex);
        index.quotedKeyIndents.set(quotedKey, quotedIndent);
      }
    }
  });
  return index;
};

/** Earliest line (0-based) recorded for any of the candidate anchor texts. */
const firstIndexedLine = (lineMap: Map<string, number>, candidates: string[]): number => {
  let first = -1;
  candidates.forEach((candidate) => {
    const found = lineMap.get(candidate);
    if (found !== undefined && (first === -1 || found < first)) {
      first = found;
    }
  });
  return first;
};

export type ImportWarningLineResolver = (warning: ImportWarning) => number;

/**
 * Creates a resolver for the 1-based line a warning anchors to in the raw
 * content, given as pre-split lines so a caller resolving many warnings
 * splits the text once and indexes it once: the warning field's own line
 * when present, the field's line within its benchmark entry for
 * benchmark-scoped warnings, the benchmark's id line when only the entry
 * is known, and line 1 for file-level warnings. Block YAML matches its
 * unquoted/dash forms; pretty-printed JSON matches quoted keys, where a
 * top-level field resolves to the shallowest-indented match so a
 * same-named nested key cannot win. Best-effort: an unmatched anchor falls
 * back to line 1. The index is built lazily, on the first resolved warning.
 */
export const createImportWarningLineResolver = (lines: string[]): ImportWarningLineResolver => {
  let index: ImportWarningLineIndex | null = null;
  const getIndex = (): ImportWarningLineIndex => (index ??= buildImportWarningLineIndex(lines));
  return (warning) => {
    if (warning.benchmarkId !== undefined) {
      const benchmarkLine = firstIndexedLine(
        getIndex().benchmarkIdLines,
        anchorQuoteVariants(warning.benchmarkId),
      );
      if (benchmarkLine === -1) {
        return 1;
      }
      const entryFields = getIndex().benchmarkEntryFields.get(benchmarkLine);
      if (warning.benchmarkField !== undefined && entryFields !== undefined) {
        const fieldLine = firstIndexedLine(
          entryFields,
          anchorQuoteVariants(warning.benchmarkField),
        );
        if (fieldLine !== -1) {
          return fieldLine + 1;
        }
      }
      return benchmarkLine + 1;
    }
    if (warning.field !== undefined) {
      const plainLine = getIndex().plainKeyLines.get(warning.field);
      if (plainLine !== undefined) {
        return plainLine + 1;
      }
      const quotedLine = getIndex().quotedKeyLines.get(warning.field);
      if (quotedLine !== undefined) {
        return quotedLine + 1;
      }
    }
    return 1;
  };
};

/**
 * Resolves a single warning's 1-based anchor line; see
 * createImportWarningLineResolver for the matching rules. Callers resolving
 * many warnings against the same lines should create the resolver once
 * instead of paying the index build per warning.
 */
export const findImportWarningLine = (lines: string[], warning: ImportWarning): number =>
  createImportWarningLineResolver(lines)(warning);

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
 * True when ch can directly precede the opening quote of a quoted flow
 * scalar. A quote anywhere else — inside a plain scalar such as
 * team's suite — is ordinary text, not a string delimiter.
 */
const isFlowTokenBoundary = (ch: string): boolean =>
  ch === ',' || ch === ':' || ch === '{' || ch === '[' || /\s/.test(ch);

/**
 * True when the colon at colonIndex is a YAML flow key-value separator. In
 * flow context a plain scalar may contain colons — the value name:foo and
 * the key name:foo both parse as a single scalar — so only a colon followed
 * by whitespace, a flow indicator, or the end of input separates a key from
 * its value.
 */
const isFlowSeparatorColon = (text: string, colonIndex: number): boolean => {
  if (colonIndex + 1 >= text.length) {
    return true;
  }
  return /[\s,{}[\]]/.test(text[colonIndex + 1]);
};

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
    // A comment (whitespace-preceded #) ends the value; it stays in the
    // text after the rewrite, and the whitespace run before it is left in
    // place so the comment keeps its leading space.
    if (ch === '#' && i > start && isFlowTokenBoundary(text[i - 1])) {
      let end = i;
      while (end > start && /\s/.test(text[end - 1])) {
        end--;
      }
      return end;
    }
    if ((ch === '"' || ch === "'") && (i === start || isFlowTokenBoundary(text[i - 1]))) {
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
 * unquoted (YAML flow) top-level name keys are both recognized — an
 * unquoted name token only when it starts an entry and is followed by a
 * separator colon, so plain values that embed colons (description:
 * name:foo) and multi-word keys (display name) are never mistaken for it;
 * when the
 * content repeats a top-level name key, the last occurrence is rewritten,
 * matching the key the JSON parser (and the BFF decoder) keeps. Comments
 * are skipped, so a key named inside a comment is never rewritten. Returns
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

  // The most recent top-level name value span. JSON.parse and the BFF's
  // decoder keep the last of duplicate keys, so the rewrite targets the
  // final occurrence, not the first.
  let nameValueSpan: { start: number; end: number } | null = null;

  const computeNameValueSpan = (colonIndex: number): { start: number; end: number } | null => {
    let valueStart = colonIndex + 1;
    while (valueStart < len && /\s/.test(text[valueStart])) {
      valueStart++;
    }
    const valueEnd = findFlowValueEnd(text, valueStart);
    if (valueEnd === -1) {
      return null;
    }
    return { start: valueStart, end: valueEnd };
  };

  let depth = 1;
  // Depth-1 entry state: whether the next depth-1 token can start a mapping
  // key, and whether the current depth-1 key has already begun. A plain YAML
  // flow key may span several whitespace-separated tokens (display name) and
  // contain non-separator colons (a:b name), and a plain value may itself
  // look like a key (description: name:foo) — so a name token is the
  // collection's name key only when it is the first token of an entry and
  // is followed by a separator colon.
  let keyPosition = true;
  let keyStarted = false;
  i++;
  while (i < len) {
    const ch = text[i];
    // A comment runs to the end of the line: keys and quotes inside it are
    // not content and must not be rewritten.
    if (ch === '#' && isFlowTokenBoundary(text[i - 1])) {
      const newline = text.indexOf('\n', i);
      if (newline === -1) {
        break;
      }
      i = newline + 1;
      continue;
    }
    // A quote opens a quoted key or value only at a token boundary; inside
    // a plain flow scalar (at any depth) it is ordinary text.
    if ((ch === '"' || ch === "'") && isFlowTokenBoundary(text[i - 1])) {
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
      const isNameKey = depth === 1 && keyPosition && !keyStarted && isNameKeyToken(text, i, end);
      end++;
      let after = end;
      while (after < len && /\s/.test(text[after])) {
        after++;
      }
      if (isNameKey && text[after] === ':') {
        // Keep scanning: a later duplicate name key is the one the JSON
        // parser keeps, so it must win.
        const span = computeNameValueSpan(after);
        if (span === null) {
          return null;
        }
        nameValueSpan = span;
        // The colon after a quoted key is always a separator, even
        // JSON-style without a following space.
        keyPosition = false;
        i = after;
        continue;
      }
      if (depth === 1 && keyPosition) {
        // A quoted scalar in key position is the entire key.
        keyStarted = true;
        if (text[after] === ':') {
          keyPosition = false;
        }
      }
      i = end;
      continue;
    }
    if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        // The first document's root mapping ended without a top-level
        // name; a name in a later document must not be rewritten.
        break;
      }
    } else if (ch === ',' && depth === 1) {
      // A comma starts the next depth-1 entry.
      keyPosition = true;
      keyStarted = false;
    } else if (ch === ':' && depth === 1 && isFlowSeparatorColon(text, i)) {
      // Only a separator colon ends a key; a colon inside a plain scalar
      // (name:foo) does not.
      keyPosition = false;
    } else if (depth === 1 && !/[\s:,]/.test(ch)) {
      // Unquoted (YAML flow) token — a key candidate only when it is the
      // first token of an entry.
      let end = i;
      while (end < len && !/[\s:,[\]{}]/.test(text[end])) {
        end++;
      }
      if (keyPosition && !keyStarted && text.slice(i, end) === 'name') {
        let after = end;
        while (after < len && /\s/.test(text[after])) {
          after++;
        }
        if (text[after] === ':' && isFlowSeparatorColon(text, after)) {
          const span = computeNameValueSpan(after);
          if (span === null) {
            return null;
          }
          nameValueSpan = span;
        }
      }
      if (keyPosition && !keyStarted) {
        keyStarted = true;
      }
      i = end;
      continue;
    }
    i++;
  }

  if (nameValueSpan !== null) {
    return replaceValue(nameValueSpan.start, nameValueSpan.end);
  }
  // No top-level name key: insert one directly after the opening brace.
  const rest = text.slice(objectStart + 1);
  const body = rest.trim();
  const separator = body === '' || body.startsWith('}') ? '' : ',';
  return `${text.slice(0, objectStart + 1)}"name": ${serialized}${separator}${rest}`;
};

/**
 * A column-zero --- document marker followed by only whitespace and an
 * optional comment (---, ---   , --- # second, ---# second): js-yaml treats
 * each as a leading marker, so the first document's root content starts on a
 * later line. Content other than a comment after the marker is not matched.
 */
const DOCUMENT_MARKER_PREFIX = /^---[ \t]*(?=$|#)/;

/**
 * A column-zero --- or ... document marker — bare, or followed by whitespace,
 * a comment, or content (--- # second, ---# second, --- name: x): js-yaml
 * ends the current document at each. Not matched: ---- and ---x, which the
 * parser reads as plain scalars.
 */
const DOCUMENT_MARKER_BOUNDARY = /^(?:---|\.\.\.)(?=$|[\s#])/;

/**
 * Offset of the first document's root node when it is a brace-delimited
 * (flow-style) mapping — the first content after any leading blank lines,
 * comments, or --- document markers (including one carrying a comment, or a
 * flow mapping on the marker line itself, --- {name: x}) — or -1 when the
 * root is not a flow mapping. A flow mapping preceded by a marker or comment
 * must still reach the flow path; the block-name regex and insertion
 * fallback both corrupt flow-style documents.
 */
const findRootFlowMappingStart = (text: string): number => {
  const lines = text.split('\n');
  let offset = 0;
  for (const line of lines) {
    if (/^\s*$/.test(line) || /^\s*#/.test(line) || DOCUMENT_MARKER_PREFIX.test(line)) {
      offset += line.length + 1;
      continue;
    }
    const flowAfterMarker = /^---[ \t]*(?=\{)/.exec(line);
    if (flowAfterMarker) {
      return offset + flowAfterMarker[0].length;
    }
    const indent = line.length - line.trimStart().length;
    return line.startsWith('{', indent) ? offset + indent : -1;
  }
  return -1;
};

/**
 * Index of the first line that begins a document after the first one: the
 * first --- or ... marker at column 0 — bare, or followed by a comment or
 * content (--- # second, --- name: x) — that follows content. Leading
 * markers, comments, and blank lines belong to the first document's
 * prefix, so they do not end it.
 */
const findFirstDocumentEnd = (lines: string[]): number => {
  let seenContent = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (DOCUMENT_MARKER_BOUNDARY.test(line) && seenContent) {
      return index;
    }
    if (line.trim() !== '' && !line.startsWith('#')) {
      seenContent = true;
    }
  }
  return lines.length;
};

/**
 * Replaces the top-level name in the raw content so the editor text stays
 * the single source of truth. Only the first document — the only one the
 * import reads — is considered: a name in a later document is never
 * rewritten, and an insertion lands inside the first document. JSON and
 * flow-mapping content (including a flow mapping preceded by comments or a
 * --- marker) has only the name value replaced in place — when that
 * in-place replacement fails, the text is returned unchanged rather than
 * falling back to block-style insertion, which would corrupt a flow
 * document; YAML replaces the
 * complete `name:` entry (its line plus any continuation lines of a
 * multi-line value indented deeper than the name key), or inserts one
 * after any leading comment, blank block, or document marker (---, with or
 * without a trailing comment) when
 * the definition has no name yet — inserting before the marker would
 * create a name-only first document and hide the rest of the definition
 * from the import, which reads only documents[0]. A block mapping's
 * top-level keys all sit at the first content line's indentation —
 * including an intentionally indented root — so the name is matched,
 * rewritten, and inserted at that indentation; a column-zero name under
 * an indented root would corrupt the document.
 */
export const applyImportName = (text: string, newName: string): string => {
  const flowStart = findRootFlowMappingStart(text);
  if (flowStart !== -1) {
    const replaced = replaceTopLevelJsonName(text.slice(flowStart), newName);
    // A flow root never falls through to the block path — a block-style
    // name line spliced in front of a flow mapping corrupts the document.
    // When the in-place replacement fails, leave the text unchanged.
    return replaced !== null ? text.slice(0, flowStart) + replaced : text;
  }
  const serialized = serializeYamlScalar(newName);
  const lines = text.split('\n');
  const firstDocumentEnd = findFirstDocumentEnd(lines);
  // The root mapping's indentation: the first content line's leading
  // whitespace, also where a missing name is inserted.
  let insertIndex = 0;
  let rootIndent = '';
  while (insertIndex < lines.length) {
    const line = lines[insertIndex];
    if (/^\s*$/.test(line) || /^\s*#/.test(line) || DOCUMENT_MARKER_PREFIX.test(line)) {
      insertIndex += 1;
      continue;
    }
    rootIndent = line.slice(0, line.length - line.trimStart().length);
    break;
  }
  // Matches plain, quoted, and space-padded-colon forms of a top-level name
  // key ("name", 'name', name :) at the root mapping's indentation; the
  // backreference pairs the quote.
  const namePattern = new RegExp(`^${escapeRegExp(rootIndent)}(["']?)name\\1[ \\t]*:`);
  let nameIndex = -1;
  for (let index = 0; index < firstDocumentEnd; index++) {
    if (namePattern.test(lines[index])) {
      nameIndex = index;
      break;
    }
  }
  if (nameIndex !== -1) {
    // Replace the whole entry: the name line plus any continuation lines of
    // a multi-line YAML value, and blank lines between them. A continuation
    // is indented deeper than the name key; sibling fields sit at the name's
    // own indentation and are never swallowed.
    const isContinuation = (line: string): boolean => {
      const trimmed = line.trimStart();
      return trimmed !== '' && line.length - trimmed.length > rootIndent.length;
    };
    let end = nameIndex + 1;
    while (end < lines.length) {
      const line = lines[end];
      if (isContinuation(line)) {
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
        if (next < lines.length && isContinuation(lines[next])) {
          end = next;
          continue;
        }
      }
      break;
    }
    // A leading anchor on the value is preserved: dropping it would leave
    // any alias to it elsewhere in the document undefined.
    const anchor = /^\s*&\S+/.exec(lines[nameIndex].replace(namePattern, ''));
    const anchorPrefix = anchor !== null ? `${anchor[0].trimStart()} ` : '';
    lines.splice(nameIndex, end - nameIndex, `${rootIndent}name: ${anchorPrefix}${serialized}`);
    return lines.join('\n');
  }
  if (newName.trim() === '') {
    return text;
  }
  if (text.trim() === '') {
    return `name: ${serialized}\n`;
  }
  lines.splice(insertIndex, 0, `${rootIndent}name: ${serialized}`);
  return lines.join('\n');
};

/**
 * Best-effort detection of a name-collision failure from the server (the
 * collections API has no dedicated conflict status), used to offer a rename
 * and retry without losing the edited content.
 */
export const isNameConflictError = (message: string): boolean =>
  /name/i.test(message) && /(exist|conflict|duplicate|already|taken)/i.test(message);

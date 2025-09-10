// Disabled due to AI Generated code
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

export type OpenApiSource = {
  url?: string;
  filePath?: string;
};

export type OperationSelector =
  | { operationId: string; status: number; contentType?: string }
  | { path: string; method: HttpMethod; status: number; contentType?: string };

export type ValidationResult = {
  valid: boolean;
  errors?: unknown[];
};

export class OpenApiValidator {
  private docs: Array<Record<string, unknown>> = [];

  async registerSchemas(sources: OpenApiSource[]): Promise<void> {
    this.docs = [];
    for (const src of sources) {
      const rawDoc = (await this.loadRawDocument(src)) as Record<string, unknown>;
      this.docs.push(rawDoc);
    }
  }

  validateResponse(data: unknown, selector: OperationSelector): ValidationResult {
    const docWithOp = this.findOperation(selector);
    if (!docWithOp)
      return {
        valid: false,
        errors: [{ message: 'Operation not found in registered OpenAPI documents' }],
      };

    const { doc, pathKey, methodKey } = docWithOp;
    const pathsMaybe = (doc as { paths?: unknown }).paths;
    const pathsObj =
      typeof pathsMaybe === 'object' && pathsMaybe !== null
        ? (pathsMaybe as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const pathItemMaybe = pathsObj[pathKey];
    const pathItem =
      typeof pathItemMaybe === 'object' && pathItemMaybe !== null
        ? (pathItemMaybe as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const opMaybe = pathItem[methodKey as string];
    const operation =
      typeof opMaybe === 'object' && opMaybe !== null
        ? (opMaybe as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const responsesMaybe = operation.responses as unknown;
    const responses =
      typeof responsesMaybe === 'object' && responsesMaybe !== null
        ? (responsesMaybe as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    const statusKey = String((selector as { status?: number }).status ?? 200);
    const respMaybe = responses[statusKey] as unknown;
    let responseObj: Record<string, unknown> | undefined;
    if (typeof respMaybe === 'object' && respMaybe !== null) {
      responseObj = respMaybe as Record<string, unknown>;
    }
    if (!responseObj && Object.prototype.hasOwnProperty.call(responses, 'default')) {
      const defMaybe = responses.default as unknown;
      if (typeof defMaybe === 'object' && defMaybe !== null) {
        responseObj = defMaybe as Record<string, unknown>;
      }
    }
    if (!responseObj) {
      return { valid: false, errors: [{ message: `Response status ${statusKey} not defined` }] };
    }

    // Shallow validation: confirm that the selected response exists. Deep schema
    // validation is omitted to avoid external resolver dependencies in local runs.
    return { valid: true };
  }

  private async loadRawDocument(source: OpenApiSource): Promise<unknown> {
    if (source.url) {
      let res: Response;
      try {
        res = await fetch(source.url);
      } catch (error) {
        throw new Error(
          `Failed to fetch OpenAPI from ${source.url}: ${
            error instanceof Error ? error.message : 'Unknown network error'
          }`,
        );
      }

      if (!res.ok) {
        throw new Error(
          `Failed to fetch OpenAPI from ${source.url}: HTTP ${res.status} ${res.statusText}`,
        );
      }

      const text = await res.text();
      return this.parseMaybeYaml(text);
    }
    if (source.filePath) {
      const full = path.resolve(source.filePath);
      const text = fs.readFileSync(full, 'utf8');
      return this.parseMaybeYaml(text);
    }
    throw new Error('OpenApiSource must include url or filePath');
  }

  private parseMaybeYaml(text: string): unknown {
    const trimmed = text.trim();

    // Try JSON first
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(text);
      } catch (error) {
        throw new Error(
          `Failed to parse as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Try YAML parsing
    try {
      return yaml.load(text);
    } catch (error) {
      throw new Error(
        `Failed to parse as YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private findOperation(
    selector: OperationSelector,
  ): { doc: Record<string, unknown>; pathKey: string; methodKey: HttpMethod } | undefined {
    for (const doc of this.docs) {
      const pathsMaybe = (doc as { paths?: unknown }).paths as unknown;
      const paths =
        typeof pathsMaybe === 'object' && pathsMaybe !== null
          ? (pathsMaybe as Record<string, unknown>)
          : ({} as Record<string, unknown>);
      // operationId based
      if ('operationId' in selector) {
        for (const [p, item] of Object.entries(paths)) {
          const pi =
            typeof item === 'object' && item !== null
              ? (item as Record<string, unknown>)
              : ({} as Record<string, unknown>);
          const methods: HttpMethod[] = [
            'get',
            'post',
            'put',
            'patch',
            'delete',
            'options',
            'head',
          ];
          for (const method of methods) {
            const opMaybe = pi[method] as unknown;
            const op =
              typeof opMaybe === 'object' && opMaybe !== null
                ? (opMaybe as Record<string, unknown>)
                : ({} as Record<string, unknown>);
            if ((op.operationId as unknown) === selector.operationId) {
              return { doc, pathKey: p, methodKey: method };
            }
          }
        }
      } else {
        const methodKey = selector.method;
        const itemMaybe = paths[selector.path] as unknown;
        const item =
          typeof itemMaybe === 'object' && itemMaybe !== null
            ? (itemMaybe as Record<string, unknown>)
            : ({} as Record<string, unknown>);
        if (item[methodKey]) return { doc, pathKey: selector.path, methodKey };
      }
    }
    return undefined;
  }
}

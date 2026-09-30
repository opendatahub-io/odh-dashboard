import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

type ScalarCounters = Record<string, number>;
type BranchCounters = Record<string, number[]>;

interface FileCoverage {
  path?: string;
  s?: ScalarCounters;
  f?: ScalarCounters;
  b?: BranchCounters;
  [key: string]: unknown;
}

export type CoverageMap = Record<string, FileCoverage>;

interface SpecCoverageEntry {
  spec: string;
  file: string;
  passed: boolean;
  sourceFiles: number;
}

const mergeScalarCounters = (
  current: ScalarCounters = {},
  incoming: ScalarCounters = {},
): ScalarCounters => {
  const merged = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = (merged[key] ?? 0) + value;
  }
  return merged;
};

const mergeBranchCounters = (
  current: BranchCounters = {},
  incoming: BranchCounters = {},
): BranchCounters => {
  const merged = Object.fromEntries(
    Object.entries(current).map(([key, values]) => [key, [...values]]),
  );
  for (const [key, values] of Object.entries(incoming)) {
    const previous = merged[key] ?? [];
    merged[key] = values.map((value, index) => (previous[index] ?? 0) + value);
  }
  return merged;
};

export const sanitizeCoverage = (coverage: CoverageMap): CoverageMap =>
  Object.fromEntries(
    Object.entries(coverage).filter(([file]) => !/data:text|__module_federation/i.test(file)),
  );

export const mergeCoverage = (current: CoverageMap, incoming: CoverageMap): CoverageMap => {
  const merged = { ...current };
  for (const [file, nextCoverage] of Object.entries(incoming)) {
    if (Object.hasOwn(merged, file)) {
      const previous = merged[file];
      merged[file] = {
        ...nextCoverage,
        s: mergeScalarCounters(previous.s, nextCoverage.s),
        f: mergeScalarCounters(previous.f, nextCoverage.f),
        b: mergeBranchCounters(previous.b, nextCoverage.b),
      };
    } else {
      merged[file] = nextCoverage;
    }
  }
  return merged;
};

export class SpecCoverageCollector {
  private currentSpec: string | undefined;

  private currentCoverage: CoverageMap = {};

  private readonly entries: SpecCoverageEntry[] = [];

  constructor(private readonly outputDirectory: string, private readonly commit: string) {}

  start(spec: string): void {
    this.currentSpec = spec;
    this.currentCoverage = {};
  }

  collect(serializedCoverage: string): string {
    const sanitized = sanitizeCoverage(JSON.parse(serializedCoverage) as CoverageMap);
    if (this.currentSpec) {
      this.currentCoverage = mergeCoverage(this.currentCoverage, sanitized);
    }
    return JSON.stringify(sanitized);
  }

  finish(passed: boolean): void {
    if (!this.currentSpec) {
      return;
    }

    fs.mkdirSync(this.outputDirectory, { recursive: true });
    const digest = crypto.createHash('sha256').update(this.currentSpec).digest('hex').slice(0, 16);
    const file = `${digest}.json`;
    fs.writeFileSync(
      path.join(this.outputDirectory, file),
      `${JSON.stringify(this.currentCoverage, null, 2)}\n`,
    );
    this.entries.push({
      spec: this.currentSpec,
      file,
      passed,
      sourceFiles: Object.keys(this.currentCoverage).length,
    });
    fs.writeFileSync(
      path.join(this.outputDirectory, 'index.json'),
      `${JSON.stringify({ commit: this.commit, specs: this.entries }, null, 2)}\n`,
    );
    this.currentSpec = undefined;
    this.currentCoverage = {};
  }
}

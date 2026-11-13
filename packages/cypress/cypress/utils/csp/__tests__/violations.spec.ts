import { describe, expect, it } from '@jest/globals';
import {
  type CspViolationRecord,
  describeViolation,
  documentsOf,
  filterByDocument,
  findUnexpected,
  hostFromURI,
  isAllowlisted,
  toAllowlist,
  toRecord,
} from '../violations';

const event = (fields: Partial<Record<string, string>>): SecurityPolicyViolationEvent =>
  fields as unknown as SecurityPolicyViolationEvent;

const record = (overrides: Partial<CspViolationRecord> = {}): CspViolationRecord => ({
  effectiveDirective: 'img-src',
  blockedURI: 'https://legacy-images.example.com/logo.png',
  blockedHost: 'legacy-images.example.com',
  sourceFile: 'https://dashboard.example/main.js',
  documentURI: 'https://dashboard.example/',
  ...overrides,
});

describe('hostFromURI', () => {
  it('returns the host of a network URL', () => {
    expect(hostFromURI('https://fonts.googleapis.com/css2?family=Roboto')).toBe(
      'fonts.googleapis.com',
    );
  });

  it('uses the scheme token for sources that have no host', () => {
    expect(hostFromURI('inline')).toBe('inline');
    expect(hostFromURI('eval')).toBe('eval');
    expect(hostFromURI('blob:https://dashboard.example/1234')).toBe('blob');
    expect(hostFromURI('data:text/html,<p>x</p>')).toBe('data');
  });

  it('reports an empty blocked URI as unknown', () => {
    expect(hostFromURI('')).toBe('unknown');
  });

  it('strips query strings and fragments when the URL cannot be parsed', () => {
    expect(hostFromURI('not a url?x=1#y')).toBe('not a url');
  });
});

describe('toRecord', () => {
  it('prefers effectiveDirective and derives the blocked host', () => {
    const result = toRecord(
      event({
        effectiveDirective: 'connect-src',
        violatedDirective: 'default-src',
        blockedURI: 'https://csp-violation-probe.invalid/csp-probe',
        sourceFile: '',
        documentURI: 'https://dashboard.example/projects',
      }),
    );

    expect(result).toEqual({
      effectiveDirective: 'connect-src',
      blockedURI: 'https://csp-violation-probe.invalid/csp-probe',
      blockedHost: 'csp-violation-probe.invalid',
      sourceFile: '',
      documentURI: 'https://dashboard.example/projects',
    });
  });

  it('attributes a violation to the fallback document when the browser omits documentURI', () => {
    expect(toRecord(event({}), 'https://dashboard.example/login').documentURI).toBe(
      'https://dashboard.example/login',
    );
  });

  it('falls back to violatedDirective, then unknown', () => {
    expect(toRecord(event({ violatedDirective: 'style-src', blockedURI: 'inline' }))).toMatchObject(
      { effectiveDirective: 'style-src' },
    );
    expect(toRecord(event({}))).toMatchObject({
      effectiveDirective: 'unknown',
      blockedHost: 'unknown',
    });
  });
});

describe('document attribution', () => {
  it('lists each document that raised a violation, in first-seen order', () => {
    expect(
      documentsOf([
        record(),
        record({ documentURI: 'https://auth.example/oauth' }),
        record({ effectiveDirective: 'script-src' }),
      ]),
    ).toEqual(['https://dashboard.example/', 'https://auth.example/oauth']);
  });

  it('keeps only the violations raised by covered documents', () => {
    const kept = filterByDocument(
      [record(), record({ documentURI: 'https://auth.example/oauth' })],
      (documentURI) => documentURI.startsWith('https://dashboard.example/'),
    );

    expect(kept).toEqual([record()]);
  });
});

describe('toAllowlist', () => {
  it('trims entries', () => {
    expect([...toAllowlist([' img-src legacy-images.example.com '])]).toEqual([
      'img-src legacy-images.example.com',
    ]);
  });
});

describe('isAllowlisted', () => {
  it('matches the directive and blocked host as one entry', () => {
    const allowlist = toAllowlist(['img-src legacy-images.example.com']);

    expect(isAllowlisted(record(), allowlist)).toBe(true);
    expect(isAllowlisted(record({ effectiveDirective: 'script-src' }), allowlist)).toBe(false);
    expect(isAllowlisted(record({ blockedHost: 'other.example.com' }), allowlist)).toBe(false);
  });
});

describe('findUnexpected', () => {
  it('keeps every violation when the allowlist is empty', () => {
    expect(
      findUnexpected([record(), record({ effectiveDirective: 'script-src' })], toAllowlist([])),
    ).toHaveLength(2);
  });

  it('drops only the allowlisted entries', () => {
    const allowlist = toAllowlist(['img-src legacy-images.example.com']);
    const unexpected = findUnexpected(
      [record(), record({ effectiveDirective: 'connect-src', blockedHost: 'api.example.com' })],
      allowlist,
    );

    expect(unexpected.map((violation) => violation.effectiveDirective)).toEqual(['connect-src']);
  });
});

describe('describeViolation', () => {
  it('names the directive, blocked URI and source', () => {
    expect(describeViolation(record())).toBe(
      'img-src blocked https://legacy-images.example.com/logo.png ' +
        '(source: https://dashboard.example/main.js)',
    );
  });

  it('reports a missing source as n/a', () => {
    expect(describeViolation(record({ sourceFile: '' }))).toContain('(source: n/a)');
  });
});

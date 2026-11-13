import {
  redactEvalHubPathSegments,
  redactEvalHubUrl,
  sanitizeEvalHubPageContext,
} from '~/app/tracking/evalhubPageContextRedaction';

describe('redactEvalHubPathSegments', () => {
  it('should redact namespace and job identifiers from results routes', () => {
    expect(redactEvalHubPathSegments('/evaluation/my-ns/results/job-123')).toBe(
      '/evaluation/[redacted]/results/[redacted]',
    );
  });

  it('should redact identifiers from collection edit and copy routes', () => {
    expect(redactEvalHubPathSegments('/evaluation/ns-1/create/collections/col-9/copy')).toBe(
      '/evaluation/[redacted]/create/collections/[redacted]/copy',
    );
    expect(redactEvalHubPathSegments('/evaluation/ns-1/create/collections/col-9/edit')).toBe(
      '/evaluation/[redacted]/create/collections/[redacted]/edit',
    );
  });

  it('should redact identifiers from reconfigure and curated collection routes', () => {
    expect(redactEvalHubPathSegments('/evaluation/ns-1/reconfigure/job-42')).toBe(
      '/evaluation/[redacted]/reconfigure/[redacted]',
    );
    expect(redactEvalHubPathSegments('/evaluation/ns-1/collections/toxicity')).toBe(
      '/evaluation/[redacted]/collections/[redacted]',
    );
  });

  it('should preserve structural segments while redacting namespace identifiers', () => {
    expect(redactEvalHubPathSegments('/evaluation/ns-1/create/collections/new')).toBe(
      '/evaluation/[redacted]/create/collections/new',
    );
    expect(redactEvalHubPathSegments('/evaluation/ns-1/compare-runs/benchmarks')).toBe(
      '/evaluation/[redacted]/compare-runs/benchmarks',
    );
  });

  it.each(['', '/', '/evaluation', '/evaluation/'])(
    'should preserve structural-only and empty paths: %s',
    (path) => {
      expect(redactEvalHubPathSegments(path)).toBe(path);
    },
  );

  it('should redact unknown route segments by default', () => {
    expect(redactEvalHubPathSegments('/evaluation/ns-1/future-view/private-id')).toBe(
      '/evaluation/[redacted]/[redacted]/[redacted]',
    );
  });
});

describe('redactEvalHubUrl', () => {
  it('should redact identifier segments and drop query strings and hashes', () => {
    expect(
      redactEvalHubUrl(
        'https://dashboard.example.com/evaluation/my-ns/results/job-1?tab=x#frag',
        'https://dashboard.example.com',
      ),
    ).toBe('https://dashboard.example.com/evaluation/[redacted]/results/[redacted]');
  });

  it('should redact the referrer URL of a previous EvalHub page', () => {
    expect(
      redactEvalHubUrl(
        'https://dashboard.example.com/evaluation/my-ns/create/start',
        'https://dashboard.example.com',
      ),
    ).toBe('https://dashboard.example.com/evaluation/[redacted]/create/start');
  });

  it('should fail closed for unparseable URLs', () => {
    expect(redactEvalHubUrl('https://', 'https://dashboard.example.com')).toBe('[redacted]');
  });

  it('should resolve relative URLs against the supplied base origin', () => {
    expect(
      redactEvalHubUrl(
        '/evaluation/my-ns/results/job-1?token=secret#details',
        'https://alternate.example.com',
      ),
    ).toBe('https://alternate.example.com/evaluation/[redacted]/results/[redacted]');
  });
});

describe('sanitizeEvalHubPageContext', () => {
  it('should redact page context without mutating the input or changing its title', () => {
    const page = Object.freeze({
      path: '/evaluation/my-ns/results/job-1',
      referrer: 'https://dashboard.example.com/evaluation/my-ns/create/start',
      search: '?tab=evaluate',
      title: 'Evaluation results',
      url: 'https://dashboard.example.com/evaluation/my-ns/results/job-1?tab=evaluate',
    });
    expect(sanitizeEvalHubPageContext(page, 'https://dashboard.example.com')).toStrictEqual({
      path: '/evaluation/[redacted]/results/[redacted]',
      referrer: 'https://dashboard.example.com/evaluation/[redacted]/create/start',
      search: '',
      title: 'Evaluation results',
      url: 'https://dashboard.example.com/evaluation/[redacted]/results/[redacted]',
    });
  });

  it('should leave missing path, url, and referrer undefined while clearing search', () => {
    expect(sanitizeEvalHubPageContext({}, 'https://dashboard.example.com')).toStrictEqual({
      path: undefined,
      url: undefined,
      referrer: undefined,
      search: '',
    });
  });
});

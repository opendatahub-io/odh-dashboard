import { resolveArtifactDirectory } from '~/app/hooks/useAutoragResults';

const basePath = 'documents-rag-optimization-pipeline/run-1/rag-templates-optimization';

describe('resolveArtifactDirectory', () => {
  it('should reject multiple UUID directories because the listing has no recency metadata', () => {
    const result = resolveArtifactDirectory(
      [
        { prefix: `${basePath}/11111111-1111-1111-1111-111111111111/` },
        { prefix: `${basePath}/22222222-2222-2222-2222-222222222222/` },
      ],
      basePath,
    );

    expect(result.id).toBeUndefined();
    expect(result.error).toContain('Multiple UUID directories');
  });

  it('should resolve the only UUID directory associated with the requested artifact path', () => {
    expect(
      resolveArtifactDirectory(
        [
          { prefix: 'other/path/33333333-3333-3333-3333-333333333333/' },
          { prefix: `${basePath}/44444444-4444-4444-4444-444444444444/` },
        ],
        basePath,
      ),
    ).toEqual({ id: '44444444-4444-4444-4444-444444444444' });
  });
});

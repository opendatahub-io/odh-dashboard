import {
  computePipelineRankSep,
  PIPELINE_NODE_SEPARATION_HORIZONTAL,
  PIPELINE_RANKSEP_MAX,
  PIPELINE_RANKSEP_MIN,
} from '~/app/topology/const';

describe('computePipelineRankSep', () => {
  it('returns default horizontal separation when max width is unknown', () => {
    expect(computePipelineRankSep(0)).toBe(PIPELINE_NODE_SEPARATION_HORIZONTAL);
    expect(computePipelineRankSep(-1)).toBe(PIPELINE_NODE_SEPARATION_HORIZONTAL);
    expect(computePipelineRankSep(Number.NaN)).toBe(PIPELINE_NODE_SEPARATION_HORIZONTAL);
    expect(computePipelineRankSep(Number.POSITIVE_INFINITY)).toBe(
      PIPELINE_NODE_SEPARATION_HORIZONTAL,
    );
  });

  it('scales ranksep up with wider nodes and clamps to max', () => {
    const low = computePipelineRankSep(200);
    const high = computePipelineRankSep(600);
    expect(high).toBeGreaterThanOrEqual(low);
    expect(high).toBeLessThanOrEqual(PIPELINE_RANKSEP_MAX);
    expect(low).toBeGreaterThanOrEqual(PIPELINE_RANKSEP_MIN);
  });
});

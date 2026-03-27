import { getVisibleTabs, TAB_DEFINITIONS } from '../tabConfig';

describe('getVisibleTabs', () => {
  it('should return all tabs for binary classification', () => {
    const tabs = getVisibleTabs('binary');
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual([
      'model-information',
      'feature-summary',
      'model-evaluation',
      'confusion-matrix',
    ]);
  });

  it('should return all tabs for multiclass classification', () => {
    const tabs = getVisibleTabs('multiclass');
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual([
      'model-information',
      'feature-summary',
      'model-evaluation',
      'confusion-matrix',
    ]);
  });

  it('should exclude confusion matrix for regression', () => {
    const tabs = getVisibleTabs('regression');
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual(['model-information', 'feature-summary', 'model-evaluation']);
    expect(keys).not.toContain('confusion-matrix');
  });

  it('should assign correct sections to tabs', () => {
    const tabs = getVisibleTabs('binary');
    const modelViewerTabs = tabs.filter((t) => t.section === 'Model viewer');
    const evaluationTabs = tabs.filter((t) => t.section === 'Evaluation');

    expect(modelViewerTabs.map((t) => t.key)).toEqual(['model-information', 'feature-summary']);
    expect(evaluationTabs.map((t) => t.key)).toEqual(['model-evaluation', 'confusion-matrix']);
  });

  it('should have a component for every tab definition', () => {
    for (const tab of TAB_DEFINITIONS) {
      expect(tab.component).toBeDefined();
    }
  });

  it('should exclude confusion matrix for timeseries', () => {
    const tabs = getVisibleTabs('timeseries');
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual(['model-information', 'feature-summary', 'model-evaluation']);
    expect(keys).not.toContain('confusion-matrix');
  });

  it('should have a non-empty tooltip for every tab', () => {
    for (const tab of TAB_DEFINITIONS) {
      expect(tab.tooltip.length).toBeGreaterThan(0);
    }
  });
});

import { css } from '@patternfly/react-styles';
import {
  EdgeStyle,
  NodeStatus,
  StatusModifier,
  getEdgeStyleClassModifier,
} from '@patternfly/react-topology';
import { getEdgeStyleConfig } from '../edgeStyleUtils';

// css() is typed string | undefined since react-styles 6.7
// (patternfly-react#11602). The helpers under test must keep returning
// strings in both cases — this mock lets each test control that.
jest.mock('@patternfly/react-styles', () => {
  const actual = jest.requireActual('@patternfly/react-styles');
  return { ...actual, css: jest.fn(actual.css) };
});

const mockedCss = jest.mocked(css);

describe('getEdgeStyleConfig', () => {
  beforeEach(() => {
    mockedCss.mockImplementation(jest.requireActual('@patternfly/react-styles').css);
  });

  afterEach(() => {
    mockedCss.mockReset();
  });

  it('composes the group class name with the custom class and all modifiers', () => {
    const { groupClassName } = getEdgeStyleConfig({
      className: 'my-custom-edge',
      selected: true,
      endTerminalStatus: NodeStatus.danger,
      isConnectedToSelection: true,
    });

    expect(groupClassName).toContain('my-custom-edge');
    expect(groupClassName).toContain('pf-m-selected');
    expect(groupClassName).toContain(StatusModifier[NodeStatus.danger]);
    expect(groupClassName).toContain('pf-m-highlighted');
  });

  it('composes the link class name with the edge style modifier', () => {
    const { linkClassName } = getEdgeStyleConfig({ edgeStyle: EdgeStyle.dashed });

    expect(linkClassName).toContain(getEdgeStyleClassModifier(EdgeStyle.dashed));
  });

  it('returns a non-empty string for the default link class name', () => {
    const { linkClassName } = getEdgeStyleConfig({});

    expect(typeof linkClassName).toBe('string');
    expect(linkClassName.length).toBeGreaterThan(0);
  });

  it('returns empty strings when css() returns undefined', () => {
    mockedCss.mockReturnValue(undefined);

    const { groupClassName, linkClassName } = getEdgeStyleConfig({
      selected: true,
      edgeStyle: EdgeStyle.dashed,
    });

    expect(groupClassName).toBe('');
    expect(linkClassName).toBe('');
  });

  it('defaults the animation duration to 1', () => {
    expect(getEdgeStyleConfig({}).edgeAnimationDuration).toBe(1);
  });

  it('passes through a configured animation duration', () => {
    expect(getEdgeStyleConfig({ animationDuration: 3 }).edgeAnimationDuration).toBe(3);
  });
});

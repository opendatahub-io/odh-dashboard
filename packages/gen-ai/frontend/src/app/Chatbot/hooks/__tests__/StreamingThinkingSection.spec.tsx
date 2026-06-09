import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@patternfly/chatbot', () => ({
  FileDetailsLabel: jest.fn(({ fileName }: { fileName: string }) => fileName),
}));

// eslint-disable-next-line import/first
import { StreamingThinkingSection } from '~/app/Chatbot/components/StreamingThinkingSection';

describe('StreamingThinkingSection', () => {
  it('should render with "Show thinking" toggle text', () => {
    render(<StreamingThinkingSection reasoningText="test reasoning" isComplete={false} />);

    expect(screen.getByText('Show thinking')).toBeInTheDocument();
  });

  it('should start expanded when isComplete is false', () => {
    render(<StreamingThinkingSection reasoningText="visible reasoning" isComplete={false} />);

    expect(screen.getByText('visible reasoning')).toBeVisible();
  });

  it('should display reasoningText inside the expandable body', () => {
    render(
      <StreamingThinkingSection reasoningText="Step 1: analyze the problem" isComplete={false} />,
    );

    expect(screen.getByText('Step 1: analyze the problem')).toBeInTheDocument();
  });

  it('should auto-collapse when isComplete transitions from false to true', () => {
    const { rerender } = render(
      <StreamingThinkingSection reasoningText="thinking..." isComplete={false} />,
    );

    expect(screen.getByText('thinking...')).toBeVisible();

    rerender(<StreamingThinkingSection reasoningText="thinking..." isComplete />);

    expect(screen.getByText('thinking...')).not.toBeVisible();
  });

  it('should allow user to manually toggle expanded/collapsed state', async () => {
    const user = userEvent.setup();
    render(<StreamingThinkingSection reasoningText="reasoning content" isComplete={false} />);

    expect(screen.getByText('reasoning content')).toBeVisible();

    await user.click(screen.getByText('Show thinking'));

    expect(screen.getByText('reasoning content')).not.toBeVisible();

    await user.click(screen.getByText('Show thinking'));

    expect(screen.getByText('reasoning content')).toBeVisible();
  });

  it('should remain collapsed after auto-collapse', () => {
    const { rerender } = render(
      <StreamingThinkingSection reasoningText="done thinking" isComplete={false} />,
    );

    rerender(<StreamingThinkingSection reasoningText="done thinking" isComplete />);

    expect(screen.getByText('done thinking')).not.toBeVisible();
  });

  it('should apply correct styling to body content', () => {
    render(<StreamingThinkingSection reasoningText="styled text" isComplete={false} />);

    const bodyDiv = screen.getByText('styled text');
    expect(bodyDiv).toHaveStyle({
      fontSize: 'var(--pf-t--global--font--size--sm)',
      whiteSpace: 'pre-wrap',
    });
  });
});

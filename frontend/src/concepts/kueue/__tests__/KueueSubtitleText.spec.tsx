import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  QueueNameText,
  QueuePositionText,
  QueueSubtitleText,
} from '#~/concepts/kueue/KueueSubtitleText';

const LOCAL_QUEUE_NAME = 'manual-lifecycle-lq';

describe('QueueNameText', () => {
  it('should bold the queue name when it appears as a separate token', () => {
    const { container } = render(
      <QueueNameText
        text={`Waiting for resources in ${LOCAL_QUEUE_NAME}`}
        queue={LOCAL_QUEUE_NAME}
      />,
    );

    expect(container).toHaveTextContent(`Waiting for resources in ${LOCAL_QUEUE_NAME}`);
    expect(screen.getByText(LOCAL_QUEUE_NAME).tagName).toBe('STRONG');
  });

  it.each([
    ['when it only appears inside another word', 'Waiting for resources in main', 'ai'],
    ['when the queue name is not present', 'Waiting for resources', LOCAL_QUEUE_NAME],
  ])('should not bold a queue name %s', (_caseName, text, queue) => {
    render(<QueueNameText text={text} queue={queue} />);

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByText(queue)).not.toBeInTheDocument();
  });

  it('should return the original text when the queue name is undefined', () => {
    render(<QueueNameText text="Waiting for resources" queue={undefined} />);

    expect(screen.getByText('Waiting for resources')).toBeInTheDocument();
  });

  it('should preserve text after the queue name', () => {
    const { container } = render(
      <QueueNameText text="Waiting in test-queue, please wait" queue="test-queue" />,
    );

    expect(container).toHaveTextContent('Waiting in test-queue, please wait');
    expect(screen.getByText('test-queue').tagName).toBe('STRONG');
  });

  it('should match queue names containing regex characters literally', () => {
    render(<QueueNameText text="Waiting for resources in queue.a" queue="queue.a" />);

    expect(screen.getByText('queue.a').tagName).toBe('STRONG');
  });
});

describe('QueuePositionText', () => {
  it('should render the queue name directly without parsing generated text', () => {
    render(<QueuePositionText position={1} queue="test-queue" />);

    expect(screen.getByText('test-queue').tagName).toBe('STRONG');
    expect(screen.getByText(/1st in/)).toBeInTheDocument();
  });
});

describe('QueueSubtitleText', () => {
  it('should render the queue name in bold with the provided styling', () => {
    const { container } = render(
      <QueueSubtitleText
        text={`Waiting for resources in ${LOCAL_QUEUE_NAME}`}
        queue={LOCAL_QUEUE_NAME}
        color="rgb(1, 2, 3)"
      />,
    );

    expect(container).toHaveTextContent(`Waiting for resources in ${LOCAL_QUEUE_NAME}`);
    expect(screen.getByText(LOCAL_QUEUE_NAME).tagName).toBe('STRONG');

    const styledText = container.querySelector('span[style]');
    expect(styledText).toHaveStyle({
      color: 'rgb(1, 2, 3)',
      textDecoration: 'underline dashed',
    });
  });
});

import * as React from 'react';
import { toOrdinal } from '@odh-dashboard/k8s-core/kueue/messageUtils';
import TruncatedText from '@odh-dashboard/ui-core/components/TruncatedText';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';

type QueuePositionTextProps = {
  position: number;
  queue: string;
};

type QueueNameTextProps = {
  text: string;
  queue: string | undefined;
};

type QueueSubtitleTextProps = QueueNameTextProps & {
  color: string;
  textDecoration?: string;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const QueueNameText: React.FC<QueueNameTextProps> = ({ text, queue }) => {
  if (!queue) {
    return <>{text}</>;
  }

  const queueNamePattern = new RegExp(`(^|\\s)(${escapeRegExp(queue)})(?=\\s|[.,;:]|$)`);
  const queueNameMatch = text.match(queueNamePattern);
  if (!queueNameMatch || queueNameMatch.index == null) {
    return <>{text}</>;
  }

  const queueNameStart = queueNameMatch.index + queueNameMatch[1].length;
  const beforeQueueName = text.slice(0, queueNameStart);
  const afterQueueName = text.slice(queueNameStart + queue.length);
  return (
    <>
      {beforeQueueName}
      <strong>{queue}</strong>
      {afterQueueName}
    </>
  );
};

export const QueueSubtitleText: React.FC<QueueSubtitleTextProps> = ({
  text,
  queue,
  color,
  textDecoration = 'underline dashed',
}) => (
  <TruncatedText
    maxLines={1}
    content={<QueueNameText text={text} queue={queue} />}
    style={{
      color,
      textDecoration,
      textUnderlineOffset: ExtraSmallSpacerSize.var,
    }}
  />
);

export const QueuePositionText: React.FC<QueuePositionTextProps> = ({ position, queue }) => (
  <>
    {toOrdinal(position)} in <strong>{queue}</strong>
    {queue.endsWith('queue') ? '' : ' queue'}
  </>
);

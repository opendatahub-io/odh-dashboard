import * as React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  FlexItem,
  Spinner,
} from '@patternfly/react-core';
import { TimesIcon, VolumeUpIcon } from '@patternfly/react-icons';

interface AudioAttachmentTileProps {
  fileName: string;
  src?: string;
  isLoading?: boolean;
  onRemove?: () => void;
  testId: string;
  playerTestId: string;
}

const AudioAttachmentTile: React.FunctionComponent<AudioAttachmentTileProps> = ({
  fileName,
  src,
  isLoading,
  onRemove,
  testId,
  playerTestId,
}) => (
  <Card isCompact className="pf-v6-u-display-inline-block" data-testid={testId}>
    <CardHeader
      actions={
        onRemove
          ? {
              actions: (
                <Button
                  variant="plain"
                  icon={<TimesIcon />}
                  onClick={onRemove}
                  aria-label={`Remove ${fileName}`}
                />
              ),
            }
          : undefined
      }
    >
      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
        <FlexItem>
          <VolumeUpIcon aria-hidden />
        </FlexItem>
        <FlexItem>
          <span className="gen-ai-chatbot-details">
            <span className="gen-ai-chatbot-filename">{fileName}</span>
            <span className="gen-ai-chatbot-type">
              {fileName.toLowerCase().endsWith('.mp3') ? 'MP3' : 'WAV'}
            </span>
          </span>
        </FlexItem>
        {isLoading && (
          <FlexItem>
            <Spinner size="sm" aria-label={`Adding ${fileName}`} />
          </FlexItem>
        )}
      </Flex>
    </CardHeader>
    {src && (
      <CardBody>
        {React.createElement('audio', {
          controls: true,
          preload: 'metadata',
          src,
          'aria-label': `Play ${fileName}`,
          style: { minHeight: 'var(--pf-t--global--spacer--2xl)' },
          'data-testid': playerTestId,
        })}
      </CardBody>
    )}
  </Card>
);

export default AudioAttachmentTile;

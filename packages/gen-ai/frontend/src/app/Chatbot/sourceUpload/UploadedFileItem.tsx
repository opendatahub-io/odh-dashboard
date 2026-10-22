import React from 'react';
import { Divider, Grid, GridItem, Progress } from '@patternfly/react-core';
import { FileIcon, TimesIcon } from '@patternfly/react-icons';
import { FileStatus } from '~/app/Chatbot/hooks/useSourceManagement';
import { formatFileSize } from './utils';

type UploadedFileItemProps = {
  id: string;
  file: File;
  progress: number;
  status: FileStatus;
};

export const UploadedFileItem: React.FC<UploadedFileItemProps> = ({
  id,
  file,
  progress,
  status,
}) => {
  const fileSize = formatFileSize(file.size);
  const title = `${file.name} (${fileSize})`;

  // For failed uploads, don't show anything at all - the toast notification is enough
  if (status === 'failed') {
    return null;
  }

  return (
    <div data-testid={`uploaded-file-item-${id}`}>
      <div className="pf-v6-u-p-sm pf-v6-u-pt-md pf-v6-u-pb-md">
        <Grid hasGutter={false}>
          {/* First column: File icon */}
          <GridItem span={1}>
            <FileIcon className="pf-v6-u-color-200" />
          </GridItem>

          <GridItem span={10} className="pf-v6-u-px-sm">
            <Progress value={progress} title={title} />
          </GridItem>

          <GridItem span={1}>
            <TimesIcon className="pf-v6-u-color-200" />
          </GridItem>
        </Grid>
      </div>
      <Divider />
    </div>
  );
};

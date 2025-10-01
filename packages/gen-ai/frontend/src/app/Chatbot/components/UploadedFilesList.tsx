import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  List,
  ListItem,
  Button,
  Flex,
  FlexItem,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Tooltip,
} from '@patternfly/react-core';
import { FileIcon, TrashIcon, SyncAltIcon } from '@patternfly/react-icons';
import { FileModel } from '~/app/types';

interface UploadedFilesListProps {
  files: FileModel[];
  isLoading: boolean;
  isDeleting: boolean;
  error: string | null;
  onRefresh: () => void;
  onDeleteFile: (fileId: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (timestamp: number): string => new Date(timestamp * 1000).toLocaleDateString();

const UploadedFilesList: React.FC<UploadedFilesListProps> = ({
  files,
  isLoading,
  isDeleting,
  error,
  onRefresh,
  onDeleteFile,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardTitle>
          <Flex>
            <FlexItem>Uploaded Files</FlexItem>
            <FlexItem align={{ default: 'alignRight' }}>
              <Button
                variant="plain"
                icon={<SyncAltIcon />}
                onClick={onRefresh}
                isDisabled={isLoading}
                aria-label="Refresh files"
              />
            </FlexItem>
          </Flex>
        </CardTitle>
        <CardBody>
          <Flex justifyContent={{ default: 'justifyContentCenter' }}>
            <Spinner size="lg" />
          </Flex>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardTitle>
          <Flex>
            <FlexItem>Uploaded Files</FlexItem>
            <FlexItem align={{ default: 'alignRight' }}>
              <Button
                variant="plain"
                icon={<SyncAltIcon />}
                onClick={onRefresh}
                isDisabled={isLoading}
                aria-label="Refresh files"
              />
            </FlexItem>
          </Flex>
        </CardTitle>
        <CardBody>
          <EmptyState>
            <EmptyStateBody>
              <strong>Error loading files</strong>
              <br />
              {error}
            </EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardTitle>
          <Flex>
            <FlexItem>Uploaded Files</FlexItem>
            <FlexItem align={{ default: 'alignRight' }}>
              <Button
                variant="plain"
                icon={<SyncAltIcon />}
                onClick={onRefresh}
                isDisabled={isLoading}
                aria-label="Refresh files"
              />
            </FlexItem>
          </Flex>
        </CardTitle>
        <CardBody>
          <EmptyState>
            <EmptyStateBody>
              <div style={{ textAlign: 'center' }}>
                <FileIcon style={{ fontSize: '2rem', marginBottom: '1rem' }} />
                <br />
                <strong>No files uploaded</strong>
                <br />
                Upload files to see them listed here for use in your conversations.
              </div>
            </EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>
        <Flex>
          <FlexItem>Uploaded Files ({files.length})</FlexItem>
          <FlexItem align={{ default: 'alignRight' }}>
            <Button
              variant="plain"
              icon={<SyncAltIcon />}
              onClick={onRefresh}
              isDisabled={isLoading}
              aria-label="Refresh files"
            />
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <List isPlain>
          {files.map((file) => (
            <ListItem key={file.id}>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <FlexItem>
                  <FileIcon />
                </FlexItem>
                <FlexItem flex={{ default: 'flex_1' }}>
                  <div>
                    <div>
                      <strong>{file.filename}</strong>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6a6e73' }}>
                      {formatFileSize(file.bytes)} • Uploaded {formatDate(file.created_at)}
                    </div>
                  </div>
                </FlexItem>
                <FlexItem>
                  <Tooltip content="Delete file">
                    <Button
                      variant="plain"
                      icon={<TrashIcon />}
                      onClick={() => onDeleteFile(file.id)}
                      isDisabled={isDeleting}
                      aria-label={`Delete ${file.filename}`}
                      isDanger
                    />
                  </Tooltip>
                </FlexItem>
              </Flex>
            </ListItem>
          ))}
        </List>
      </CardBody>
    </Card>
  );
};

export default UploadedFilesList;

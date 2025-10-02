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
import DeleteFileModal from './DeleteFileModal';

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
  const [fileToDelete, setFileToDelete] = React.useState<FileModel | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const handleDeleteClick = (file: FileModel) => {
    setFileToDelete(file);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (fileToDelete) {
      onDeleteFile(fileToDelete.id);
      setIsDeleteModalOpen(false);
      setFileToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setFileToDelete(null);
  };
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

  // Don't render anything if there are no files
  if (files.length === 0) {
    return null;
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
                      onClick={() => handleDeleteClick(file)}
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
      <DeleteFileModal
        isOpen={isDeleteModalOpen}
        file={fileToDelete}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </Card>
  );
};

export default UploadedFilesList;

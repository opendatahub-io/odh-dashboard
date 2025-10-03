import * as React from 'react';
import {
  deleteVectorStoreFile,
  getVectorStores,
  listVectorStoreFiles,
} from '~/app/services/llamaStackService';
import { FileModel, VectorStoreFile } from '~/app/types';
import { GenAiContext } from '~/app/context/GenAiContext';

export interface UseFileManagementReturn {
  files: FileModel[];
  isLoading: boolean;
  error: string | null;
  refreshFiles: () => Promise<void>;
  deleteFileById: (fileId: string) => Promise<void>;
  isDeleting: boolean;
}

interface UseFileManagementProps {
  onShowDeleteSuccessAlert?: () => void;
  onShowErrorAlert?: (message?: string) => void;
}

// Helper function to convert VectorStoreFile to FileModel format
const convertVectorStoreFileToFileModel = (vectorStoreFile: VectorStoreFile): FileModel => ({
  id: vectorStoreFile.id,
  object: vectorStoreFile.object,
  bytes: vectorStoreFile.bytes || vectorStoreFile.usage_bytes,
  // eslint-disable-next-line camelcase
  created_at: vectorStoreFile.created_at,
  filename: vectorStoreFile.filename || `file-${vectorStoreFile.id}`, // Use actual filename from API, fallback to ID
  purpose: vectorStoreFile.purpose || 'assistants',
  status: vectorStoreFile.status,
  // eslint-disable-next-line camelcase
  expires_at: 0, // Vector store files don't have expiration
  // eslint-disable-next-line camelcase
  status_details: vectorStoreFile.last_error?.message || '',
});

const useFileManagement = (props: UseFileManagementProps = {}): UseFileManagementReturn => {
  const { onShowDeleteSuccessAlert, onShowErrorAlert } = props;
  const { namespace } = React.useContext(GenAiContext);
  const [files, setFiles] = React.useState<FileModel[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentVectorStoreId, setCurrentVectorStoreId] = React.useState<string | null>(null);

  const refreshFiles = React.useCallback(async () => {
    if (!namespace?.name) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, get the list of vector stores
      const vectorStores = await getVectorStores(namespace.name);

      if (vectorStores.length === 0) {
        // No vector stores available, set empty files list
        setFiles([]);
        return;
      }

      // Use the first vector store ID
      const firstVectorStoreId = vectorStores[0].id;
      setCurrentVectorStoreId(firstVectorStoreId);

      // Get files from the first vector store
      const vectorStoreFiles = await listVectorStoreFiles(
        namespace.name,
        firstVectorStoreId,
        50,
        'desc',
        'completed',
      );

      // Convert vector store files to FileModel format
      const convertedFiles = vectorStoreFiles.map(convertVectorStoreFileToFileModel);
      setFiles(convertedFiles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch files';
      setError(errorMessage);
      onShowErrorAlert?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [namespace, onShowErrorAlert]);

  const deleteFileById = React.useCallback(
    async (fileId: string) => {
      if (!namespace?.name || !currentVectorStoreId) {
        return;
      }

      setIsDeleting(true);
      setError(null);

      try {
        await deleteVectorStoreFile(namespace.name, currentVectorStoreId, fileId);
        // Remove the deleted file from the local state
        setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
        onShowDeleteSuccessAlert?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
        setError(errorMessage);
        onShowErrorAlert?.(errorMessage);
      } finally {
        setIsDeleting(false);
      }
    },
    [namespace, currentVectorStoreId, onShowDeleteSuccessAlert, onShowErrorAlert],
  );

  // Load files on mount and when namespace changes
  React.useEffect(() => {
    refreshFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace?.name]); // Only depend on namespace.name, not the entire refreshFiles function

  return {
    files,
    isLoading,
    error,
    refreshFiles,
    deleteFileById,
    isDeleting,
  };
};

export default useFileManagement;

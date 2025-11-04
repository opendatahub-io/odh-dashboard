import * as React from 'react';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { FileModel, VectorStoreFile } from '~/app/types';
import { GenAiContext } from '~/app/context/GenAiContext';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';

export interface UseFileManagementReturn {
  files: FileModel[];
  isLoading: boolean;
  error: string | null;
  refreshFiles: () => Promise<void>;
  deleteFileById: (fileId: string) => Promise<void>;
  isDeleting: boolean;
  currentVectorStoreId: string | null;
}

interface UseFileManagementProps {
  onShowDeleteSuccessAlert?: () => void;
  onShowErrorAlert?: (message?: string, title?: string) => void;
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

export const DELETE_EVENT_NAME = 'Playground RAG Delete File';

const useFileManagement = (props: UseFileManagementProps = {}): UseFileManagementReturn => {
  const { onShowDeleteSuccessAlert, onShowErrorAlert } = props;
  const { namespace } = React.useContext(GenAiContext);
  const [files, setFiles] = React.useState<FileModel[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentVectorStoreId, setCurrentVectorStoreId] = React.useState<string | null>(null);
  const { api, apiAvailable } = useGenAiAPI();

  const refreshFiles = React.useCallback(async () => {
    if (!apiAvailable) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, get the list of vector stores
      const vectorStores = await api.listVectorStores();

      if (vectorStores.length === 0) {
        // No vector stores available, set empty files list
        setFiles([]);
        return;
      }

      // Use the first vector store ID
      const firstVectorStoreId = vectorStores[0].id;
      setCurrentVectorStoreId(firstVectorStoreId);

      // Get files from the first vector store
      const vectorStoreFiles = await api.listVectorStoreFiles({
        // eslint-disable-next-line camelcase
        vector_store_id: firstVectorStoreId,
        limit: 50,
        order: 'desc',
        filter: 'completed',
      });

      // Convert vector store files to FileModel format
      const convertedFiles = vectorStoreFiles.map(convertVectorStoreFileToFileModel);
      setFiles(convertedFiles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch files';
      setError(errorMessage);
      onShowErrorAlert?.(errorMessage, 'File Fetch Error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowErrorAlert, api, apiAvailable]);

  const deleteFileById = React.useCallback(
    async (fileId: string) => {
      if (!apiAvailable || !currentVectorStoreId) {
        return;
      }

      setIsDeleting(true);
      setError(null);

      try {
        await api.deleteVectorStoreFile(
          {},
          {
            /* eslint-disable camelcase */
            vector_store_id: currentVectorStoreId,
            file_id: fileId,
            /* eslint-enable camelcase */
          },
        );
        // Remove the deleted file from the local state
        setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
        fireFormTrackingEvent(DELETE_EVENT_NAME, {
          outcome: TrackingOutcome.submit,
          success: true,
        });
        onShowDeleteSuccessAlert?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
        setError(errorMessage);
        fireFormTrackingEvent(DELETE_EVENT_NAME, {
          outcome: TrackingOutcome.submit,
          success: false,
          error: errorMessage,
        });
        onShowErrorAlert?.(errorMessage, 'File Delete Error');
      } finally {
        setIsDeleting(false);
      }
    },
    [currentVectorStoreId, onShowDeleteSuccessAlert, onShowErrorAlert, api, apiAvailable],
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
    currentVectorStoreId,
  };
};

export default useFileManagement;

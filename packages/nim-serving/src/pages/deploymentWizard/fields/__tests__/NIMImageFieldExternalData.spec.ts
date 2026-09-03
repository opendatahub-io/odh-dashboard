import { testHook } from '@odh-dashboard/jest-config/hooks';
import useNIMAccountStatus, { NIMAccountStatus } from '../../../../api/accounts/hooks';
import { useNIMImages } from '../../../../api/images/hooks';
import { useFetchNIMTemplate } from '../../../../api/servingruntime/useFetchNIMTemplate';
import { useNIMImageFieldExternalData } from '../NIMImageField';

jest.mock('../../../../api/accounts/hooks', () => ({
  __esModule: true,
  default: jest.fn(),
  NIMAccountStatus: {
    LOADING: 'LOADING',
    NOT_FOUND: 'NOT_FOUND',
    PENDING: 'PENDING',
    ERROR: 'ERROR',
    READY: 'READY',
  },
}));

jest.mock('../../../../api/images/hooks', () => ({
  useNIMImages: jest.fn(),
}));

jest.mock('../../../../api/servingruntime/useFetchNIMTemplate', () => ({
  useFetchNIMTemplate: jest.fn(),
}));

const mockUseNIMAccountStatus = jest.mocked(useNIMAccountStatus);
const mockUseNIMImages = jest.mocked(useNIMImages);
const mockUseFetchNIMTemplate = jest.mocked(useFetchNIMTemplate);

const NOT_READY_IMAGES = {
  data: { images: [], projectName: 'test-project' },
  loaded: false,
};

const NOT_READY_TEMPLATE = {
  data: undefined,
  loaded: false,
  error: undefined,
  refresh: jest.fn(),
};

describe('useNIMImageFieldExternalData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNIMImages.mockReturnValue(NOT_READY_IMAGES);
    mockUseFetchNIMTemplate.mockReturnValue(NOT_READY_TEMPLATE);
  });

  it('should not block editing while the NIM Account is pending', () => {
    mockUseNIMAccountStatus.mockReturnValue({
      status: NIMAccountStatus.PENDING,
      nimAccount: null,
      errorMessages: [],
      loaded: true,
      refresh: jest.fn(),
      startRevalidation: jest.fn(),
    });

    const result = testHook(useNIMImageFieldExternalData)({
      project: { projectName: 'test-project' },
      isEditing: true,
    });

    expect(result.result.current.loaded).toBe(true);
    expect(result.result.current.data.nimImagesLoaded).toBe(false);
  });

  it('should not mark a missing Account catalog as loaded', () => {
    mockUseNIMAccountStatus.mockReturnValue({
      status: NIMAccountStatus.NOT_FOUND,
      nimAccount: null,
      errorMessages: [],
      loaded: true,
      refresh: jest.fn(),
      startRevalidation: jest.fn(),
    });

    const result = testHook(useNIMImageFieldExternalData)({
      project: { projectName: 'test-project' },
      isEditing: true,
    });

    expect(result.result.current.loaded).toBe(true);
    expect(result.result.current.data.nimImagesLoaded).toBe(false);
  });
});

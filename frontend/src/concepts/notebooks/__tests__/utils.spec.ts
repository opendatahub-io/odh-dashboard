import { InProgressIcon } from '@patternfly/react-icons';
import { t_global_text_color_regular as RegularColor } from '@patternfly/react-tokens';
import { EventStatus } from '#~/types';
import { KueueWorkloadStatus } from '#~/concepts/kueue/types';
import type { KueueStatusInfo } from '#~/concepts/kueue/types';
import { getKueueStatusInfo } from '#~/concepts/kueue';
import { getStatusLineIconAndColor } from '#~/concepts/notebooks/utils';

jest.mock('#~/concepts/kueue', () => ({
  ...jest.requireActual('#~/concepts/kueue'),
  getKueueStatusInfo: jest.fn(),
}));

const getKueueStatusInfoMock = jest.mocked(getKueueStatusInfo);

const mockKueueStatusInfo = (overrides?: Partial<KueueStatusInfo>): KueueStatusInfo => ({
  label: 'MockLabel',
  IconComponent: InProgressIcon,
  contentColor: '--mock-color',
  iconClassName: 'mock-class',
  ...overrides,
});

const makeNotebookStatus = (status: EventStatus) => ({
  currentStatus: status,
  currentEvent: '',
  currentEventReason: '',
  currentEventDescription: '',
});

describe('getStatusLineIconAndColor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getKueueStatusInfoMock.mockReturnValue(mockKueueStatusInfo());
  });

  describe('when kueueStatus is present and eventStatus is not ERROR', () => {
    it('should return icon info from kueueStatus', () => {
      const result = getStatusLineIconAndColor({
        kueueStatus: { status: KueueWorkloadStatus.Queued },
        notebookStatus: makeNotebookStatus(EventStatus.INFO),
        inProgress: false,
      });

      expect(getKueueStatusInfoMock).toHaveBeenCalledWith(KueueWorkloadStatus.Queued);
      expect(result).toEqual({
        IconComponent: InProgressIcon,
        color: '--mock-color',
        iconClassName: 'mock-class',
      });
    });

    it('should use RegularColor when contentColor is undefined', () => {
      getKueueStatusInfoMock.mockReturnValue(mockKueueStatusInfo({ contentColor: undefined }));

      const result = getStatusLineIconAndColor({
        kueueStatus: { status: KueueWorkloadStatus.Running },
        inProgress: false,
      });

      expect(result.color).toBe(RegularColor.var);
    });

    it('should take precedence over inProgress', () => {
      const result = getStatusLineIconAndColor({
        kueueStatus: { status: KueueWorkloadStatus.Queued },
        inProgress: true,
      });

      expect(getKueueStatusInfoMock).toHaveBeenCalledWith(KueueWorkloadStatus.Queued);
      expect(result.IconComponent).toBe(InProgressIcon);
    });

    it.each([
      EventStatus.INFO,
      EventStatus.SUCCESS,
      EventStatus.WARNING,
      EventStatus.PENDING,
      EventStatus.IN_PROGRESS,
    ])('should use kueueStatus when eventStatus is %s', (eventStatus) => {
      getStatusLineIconAndColor({
        kueueStatus: { status: KueueWorkloadStatus.Admitted },
        notebookStatus: makeNotebookStatus(eventStatus),
        inProgress: false,
      });

      expect(getKueueStatusInfoMock).toHaveBeenCalledWith(KueueWorkloadStatus.Admitted);
    });
  });

  describe('when kueueStatus is present but eventStatus is ERROR', () => {
    it('should ignore kueueStatus and resolve from notebook ERROR as Failed', () => {
      const result = getStatusLineIconAndColor({
        kueueStatus: { status: KueueWorkloadStatus.Queued },
        notebookStatus: makeNotebookStatus(EventStatus.ERROR),
        inProgress: false,
      });

      expect(getKueueStatusInfoMock).toHaveBeenCalledWith(KueueWorkloadStatus.Failed);
      expect(result).toEqual({
        IconComponent: InProgressIcon,
        color: '--mock-color',
        iconClassName: 'mock-class',
      });
    });
  });

  describe('when kueueStatus is absent, resolving from notebook eventStatus', () => {
    it('should map ERROR to KueueWorkloadStatus.Failed', () => {
      getStatusLineIconAndColor({
        notebookStatus: makeNotebookStatus(EventStatus.ERROR),
        inProgress: false,
      });

      expect(getKueueStatusInfoMock).toHaveBeenCalledWith(KueueWorkloadStatus.Failed);
    });

    it('should map WARNING to KueueWorkloadStatus.Preempted', () => {
      getStatusLineIconAndColor({
        notebookStatus: makeNotebookStatus(EventStatus.WARNING),
        inProgress: false,
      });

      expect(getKueueStatusInfoMock).toHaveBeenCalledWith(KueueWorkloadStatus.Preempted);
    });

    it('should use RegularColor when contentColor is undefined for resolved notebook status', () => {
      getKueueStatusInfoMock.mockReturnValue(mockKueueStatusInfo({ contentColor: undefined }));

      const result = getStatusLineIconAndColor({
        notebookStatus: makeNotebookStatus(EventStatus.ERROR),
        inProgress: false,
      });

      expect(result.color).toBe(RegularColor.var);
    });
  });

  describe('when inProgress is true and eventStatus allows it', () => {
    it('should return InProgressIcon when eventStatus is undefined', () => {
      const result = getStatusLineIconAndColor({
        inProgress: true,
      });

      expect(result).toEqual({
        IconComponent: InProgressIcon,
        color: RegularColor.var,
        iconClassName: 'odh-u-spin',
      });
      expect(getKueueStatusInfoMock).not.toHaveBeenCalled();
    });

    it('should return InProgressIcon when eventStatus is INFO', () => {
      const result = getStatusLineIconAndColor({
        notebookStatus: makeNotebookStatus(EventStatus.INFO),
        inProgress: true,
      });

      expect(result).toEqual({
        IconComponent: InProgressIcon,
        color: RegularColor.var,
        iconClassName: 'odh-u-spin',
      });
    });

    it('should return InProgressIcon when eventStatus is SUCCESS', () => {
      const result = getStatusLineIconAndColor({
        notebookStatus: makeNotebookStatus(EventStatus.SUCCESS),
        inProgress: true,
      });

      expect(result).toEqual({
        IconComponent: InProgressIcon,
        color: RegularColor.var,
        iconClassName: 'odh-u-spin',
      });
    });
  });

  describe('default fallback', () => {
    it('should return null icon when no conditions match', () => {
      const result = getStatusLineIconAndColor({
        inProgress: false,
      });

      expect(result).toEqual({
        IconComponent: null,
        color: RegularColor.var,
      });
    });

    it('should return null icon when eventStatus is INFO and not inProgress', () => {
      const result = getStatusLineIconAndColor({
        notebookStatus: makeNotebookStatus(EventStatus.INFO),
        inProgress: false,
      });

      expect(result).toEqual({
        IconComponent: null,
        color: RegularColor.var,
      });
    });

    it('should return null icon when eventStatus is SUCCESS and not inProgress', () => {
      const result = getStatusLineIconAndColor({
        notebookStatus: makeNotebookStatus(EventStatus.SUCCESS),
        inProgress: false,
      });

      expect(result).toEqual({
        IconComponent: null,
        color: RegularColor.var,
      });
    });

    it('should return null icon when notebookStatus is null', () => {
      const result = getStatusLineIconAndColor({
        notebookStatus: null,
        kueueStatus: null,
        inProgress: false,
      });

      expect(result).toEqual({
        IconComponent: null,
        color: RegularColor.var,
      });
    });
  });
});

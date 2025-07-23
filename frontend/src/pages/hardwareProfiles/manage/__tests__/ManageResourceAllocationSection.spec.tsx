/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useIsAreaAvailable } from '#~/concepts/areas';
import useDefaultDsc from '#~/pages/clusterSettings/useDefaultDsc';
import useWorkloadPriorityClasses from '#~/concepts/distributedWorkloads/useWorkloadPriorityClasses';
import { SchedulingType, TolerationOperator } from '#~/types';
import { DEFAULT_PRIORITY_CLASS } from '#~/pages/hardwareProfiles/nodeResource/const';
import ManageResourceAllocationSection from '#~/pages/hardwareProfiles/manage/ManageResourceAllocationSection';

// Mock only external dependencies/hooks
jest.mock('#~/concepts/areas');
jest.mock('#~/pages/clusterSettings/useDefaultDsc');
jest.mock('#~/concepts/distributedWorkloads/useWorkloadPriorityClasses');

const mockUseIsAreaAvailable = useIsAreaAvailable as jest.MockedFunction<typeof useIsAreaAvailable>;
const mockUseDefaultDsc = useDefaultDsc as jest.MockedFunction<typeof useDefaultDsc>;
const mockUseWorkloadPriorityClasses = useWorkloadPriorityClasses as jest.MockedFunction<
  typeof useWorkloadPriorityClasses
>;

describe('ManageResourceAllocationSection', () => {
  const mockSetScheduling = jest.fn();

  const defaultProps = {
    scheduling: undefined,
    setScheduling: mockSetScheduling,
    existingType: undefined,
  };

  // Mock workload priority classes data
  const mockWorkloadPriorityClasses = [
    {
      apiVersion: 'kueue.x-k8s.io/v1beta1',
      kind: 'WorkloadPriorityClass',
      metadata: { name: 'high-priority', namespace: 'default' },
      description: 'High priority workloads',
      value: 100,
    },
    {
      apiVersion: 'kueue.x-k8s.io/v1beta1',
      kind: 'WorkloadPriorityClass',
      metadata: { name: 'medium-priority', namespace: 'default' },
      description: 'Medium priority workloads',
      value: 50,
    },
    {
      apiVersion: 'kueue.x-k8s.io/v1beta1',
      kind: 'WorkloadPriorityClass',
      metadata: { name: 'low-priority', namespace: 'default' },
      description: 'Low priority workloads',
      value: 10,
    },
  ] as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseIsAreaAvailable.mockReturnValue({ status: true } as any);
    mockUseDefaultDsc.mockReturnValue([
      { spec: { components: { kueue: { defaultLocalQueueName: 'default-queue' } } } },
      true,
      undefined,
    ] as any);
    mockUseWorkloadPriorityClasses.mockReturnValue([mockWorkloadPriorityClasses, true, undefined]);
  });

  describe('Priority Preservation', () => {
    it('should preserve priority class when switching from QUEUE to NODE and back to QUEUE', async () => {
      const initialScheduling = {
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'test-queue',
          priorityClass: 'high-priority',
        },
      };

      const { rerender } = render(
        <ManageResourceAllocationSection {...defaultProps} scheduling={initialScheduling} />,
      );

      // Wait for components to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('test-queue')).toBeInTheDocument();
      });

      // Find and click the Node strategy radio button
      const nodeRadio = screen.getByRole('radio', { name: /node selectors and tolerations/i });
      fireEvent.click(nodeRadio);

      // Verify setScheduling was called with preserved data
      expect(mockSetScheduling).toHaveBeenCalledWith({
        type: SchedulingType.NODE,
        kueue: {
          localQueueName: 'test-queue',
          priorityClass: 'high-priority',
        },
        node: {
          nodeSelector: {},
          tolerations: [],
        },
      });

      // Simulate the state change by re-rendering with NODE type
      const nodeScheduling = {
        type: SchedulingType.NODE,
        kueue: {
          localQueueName: 'test-queue',
          priorityClass: 'high-priority',
        },
        node: {
          nodeSelector: {},
          tolerations: [],
        },
      };

      rerender(<ManageResourceAllocationSection {...defaultProps} scheduling={nodeScheduling} />);

      // Clear previous calls
      mockSetScheduling.mockClear();

      // Switch back to QUEUE type
      const queueRadio = screen.getByRole('radio', { name: /local queue/i });
      fireEvent.click(queueRadio);

      // Verify setScheduling preserves the priority
      expect(mockSetScheduling).toHaveBeenCalledWith({
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'test-queue',
          priorityClass: 'high-priority',
        },
        node: {
          nodeSelector: {},
          tolerations: [],
        },
      });
    });

    it('should preserve node selector and tolerations when switching from NODE to QUEUE', () => {
      const initialScheduling = {
        type: SchedulingType.NODE,
        node: {
          nodeSelector: { 'node-type': 'gpu' },
          tolerations: [{ key: 'gpu-node', operator: TolerationOperator.EQUAL, value: 'true' }],
        },
      };

      render(<ManageResourceAllocationSection {...defaultProps} scheduling={initialScheduling} />);

      // Switch to QUEUE type
      const queueRadio = screen.getByRole('radio', { name: /local queue/i });
      fireEvent.click(queueRadio);

      // Verify setScheduling preserves node data
      expect(mockSetScheduling).toHaveBeenCalledWith({
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: '',
          priorityClass: DEFAULT_PRIORITY_CLASS,
        },
        node: {
          nodeSelector: { 'node-type': 'gpu' },
          tolerations: [{ key: 'gpu-node', operator: TolerationOperator.EQUAL, value: 'true' }],
        },
      });
    });

    it('should handle empty scheduling state gracefully', () => {
      render(<ManageResourceAllocationSection {...defaultProps} scheduling={undefined} />);

      // Should show queue sections by default when kueue is available
      expect(screen.getByRole('radio', { name: /local queue/i })).toBeChecked();

      // Switch to NODE type
      const nodeRadio = screen.getByRole('radio', { name: /node selectors and tolerations/i });
      fireEvent.click(nodeRadio);

      // Verify setScheduling handles undefined scheduling
      expect(mockSetScheduling).toHaveBeenCalledWith({
        type: SchedulingType.NODE,
        kueue: {
          localQueueName: '',
          priorityClass: DEFAULT_PRIORITY_CLASS,
        },
        node: {
          nodeSelector: {},
          tolerations: [],
        },
      });
    });
  });

  describe('Priority Updates', () => {
    it('should update priority class correctly', async () => {
      const initialScheduling = {
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'test-queue',
          priorityClass: DEFAULT_PRIORITY_CLASS,
        },
      };

      render(<ManageResourceAllocationSection {...defaultProps} scheduling={initialScheduling} />);

      // Wait for priority dropdown to load
      await waitFor(() => {
        expect(screen.getByTestId('workload-priority-select')).toBeInTheDocument();
      });

      // Click the priority dropdown
      const priorityDropdown = screen.getByTestId('workload-priority-select');
      fireEvent.click(priorityDropdown);

      // Select high priority
      await waitFor(() => {
        const highPriorityOption = screen.getByText('high-priority');
        fireEvent.click(highPriorityOption);
      });

      // Verify setScheduling was called with updated priority
      expect(mockSetScheduling).toHaveBeenCalledWith({
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'test-queue',
          priorityClass: 'high-priority',
        },
      });
    });

    it('should preserve existing priority when updating local queue name', async () => {
      const initialScheduling = {
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'old-queue',
          priorityClass: 'high-priority',
        },
      };

      render(<ManageResourceAllocationSection {...defaultProps} scheduling={initialScheduling} />);

      // Update local queue name
      const localQueueInput = screen.getByDisplayValue('old-queue');
      fireEvent.change(localQueueInput, { target: { value: 'new-queue' } });

      // Verify setScheduling preserves priority
      expect(mockSetScheduling).toHaveBeenCalledWith({
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'new-queue',
          priorityClass: 'high-priority',
        },
      });
    });
  });

  describe('Default Local Queue Effect', () => {
    it('should preserve priority when setting default local queue', () => {
      const initialScheduling = {
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: '',
          priorityClass: 'high-priority',
        },
      };

      // Mock DSC with default local queue
      mockUseDefaultDsc.mockReturnValue([
        { spec: { components: { kueue: { defaultLocalQueueName: 'default-queue' } } } },
        true,
        undefined,
      ] as any);

      render(
        <ManageResourceAllocationSection
          {...defaultProps}
          scheduling={initialScheduling}
          existingType={SchedulingType.NODE} // Trigger the effect
        />,
      );

      // Verify effect preserves existing priority
      expect(mockSetScheduling).toHaveBeenCalledWith({
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'default-queue',
          priorityClass: 'high-priority',
        },
      });
    });

    it('should not trigger effect when local queue already exists', () => {
      const initialScheduling = {
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'existing-queue',
          priorityClass: 'high-priority',
        },
      };

      render(
        <ManageResourceAllocationSection
          {...defaultProps}
          scheduling={initialScheduling}
          existingType={SchedulingType.NODE}
        />,
      );

      // Verify effect doesn't trigger when local queue already exists
      expect(mockSetScheduling).not.toHaveBeenCalled();
    });
  });

  describe('UI Conditional Rendering', () => {
    it('should show queue sections when scheduling type is QUEUE', async () => {
      const queueScheduling = {
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'test-queue',
          priorityClass: 'high-priority',
        },
      };

      render(<ManageResourceAllocationSection {...defaultProps} scheduling={queueScheduling} />);

      // Should show local queue and priority sections
      expect(screen.getByDisplayValue('test-queue')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('workload-priority-select')).toBeInTheDocument();
      });

      // Should not show node sections
      expect(screen.queryByText(/add node selector/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/add toleration/i)).not.toBeInTheDocument();
    });

    it('should show node sections when scheduling type is NODE', () => {
      const nodeScheduling = {
        type: SchedulingType.NODE,
        node: {
          nodeSelector: {},
          tolerations: [],
        },
      };

      render(<ManageResourceAllocationSection {...defaultProps} scheduling={nodeScheduling} />);

      // Should show node selector and toleration sections
      expect(screen.getByText(/add node selector/i)).toBeInTheDocument();
      expect(screen.getByText(/add toleration/i)).toBeInTheDocument();

      // Should not show queue sections
      expect(screen.queryByTestId('workload-priority-select')).not.toBeInTheDocument();
    });

    it('should show queue sections when kueue is available and no scheduling type', async () => {
      mockUseIsAreaAvailable.mockReturnValue({ status: true } as any);

      render(<ManageResourceAllocationSection {...defaultProps} scheduling={undefined} />);

      // Should default to queue sections
      expect(screen.getByRole('radio', { name: /local queue/i })).toBeChecked();

      await waitFor(() => {
        expect(screen.getByTestId('workload-priority-select')).toBeInTheDocument();
      });
    });
  });

  describe('Kueue Availability', () => {
    it('should handle disabled kueue correctly', () => {
      mockUseIsAreaAvailable.mockReturnValue({ status: false } as any);

      const scheduling = {
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'test-queue',
          priorityClass: 'high-priority',
        },
      };

      render(
        <ManageResourceAllocationSection
          {...defaultProps}
          scheduling={scheduling}
          existingType={SchedulingType.QUEUE}
        />,
      );

      // Should show disabled alert
      expect(screen.getByText(/kueue feature flag is disabled/i)).toBeInTheDocument();
    });

    it('should show only node strategy when kueue is disabled and no existing queue type', () => {
      mockUseIsAreaAvailable.mockReturnValue({ status: false } as any);

      render(
        <ManageResourceAllocationSection
          {...defaultProps}
          scheduling={undefined}
          existingType={undefined}
        />,
      );

      // Should only show node strategy
      expect(screen.queryByRole('radio', { name: /local queue/i })).not.toBeInTheDocument();
      expect(screen.getByText(/node selectors and tolerations/i)).toBeInTheDocument();
    });
  });

  describe('WorkloadPriority Race Condition Fix', () => {
    it('should handle workload priority options loading delay', async () => {
      // Start with loading state
      mockUseWorkloadPriorityClasses.mockReturnValue([[], false, undefined]);

      const scheduling = {
        type: SchedulingType.QUEUE,
        kueue: {
          localQueueName: 'test-queue',
          priorityClass: 'high-priority',
        },
      };

      const { rerender } = render(
        <ManageResourceAllocationSection {...defaultProps} scheduling={scheduling} />,
      );

      // Priority dropdown should still show the current value even when options haven't loaded
      await waitFor(() => {
        const prioritySelect = screen.getByTestId('workload-priority-select');
        expect(prioritySelect).toHaveTextContent('high-priority');
      });

      // Now simulate options loading
      mockUseWorkloadPriorityClasses.mockReturnValue([
        mockWorkloadPriorityClasses,
        true,
        undefined,
      ]);

      rerender(<ManageResourceAllocationSection {...defaultProps} scheduling={scheduling} />);

      // Should still show the correct priority
      await waitFor(() => {
        const prioritySelect = screen.getByTestId('workload-priority-select');
        expect(prioritySelect).toHaveTextContent('high-priority');
      });
    });
  });
});

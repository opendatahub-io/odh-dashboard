import { checkModelStatus } from '~/pages/modelServing/screens/global/utils';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';

const mockModelStatus = (status: boolean) => ({
  failedToSchedule: status,
});

describe('checkModelStatus', () => {
  it('Should return true  when pod fails to schedule due to insufficient resources.', async () => {
    expect(checkModelStatus(mockPodK8sResource({ isPending: true }))).toEqual(
      mockModelStatus(true),
    );
  });

  it('Should return false when pod is scheduled.', async () => {
    expect(checkModelStatus(mockPodK8sResource({}))).toEqual(mockModelStatus(false));
  });
});

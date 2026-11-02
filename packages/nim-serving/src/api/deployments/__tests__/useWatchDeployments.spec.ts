import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { ProjectKind, PodKind } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import type { NIMDeployment } from '../useWatchDeployments';
import { useWatchDeployments } from '../useWatchDeployments';
import * as deploymentWatchModule from '../watch';
import * as nimServicesWatchModule from '../../nimservices/watch';

jest.mock('../watch');
jest.mock('../../nimservices/watch');

type DeploymentHookResult = [NIMDeployment[] | undefined, boolean, Error[] | undefined];

describe('useWatchDeployments', () => {
  let mockProject: ProjectKind;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProject = mockProjectK8sResource({ k8sName: 'test-project' });
    jest.mocked(nimServicesWatchModule.useWatchNIMServices).mockReturnValue([[], true, undefined]);
    jest
      .mocked(deploymentWatchModule.useWatchInferenceServices)
      .mockReturnValue([[], true, undefined] as [
        InferenceServiceKind[],
        boolean,
        Error | undefined,
      ]);
    jest
      .mocked(deploymentWatchModule.useWatchNIMDeploymentPods)
      .mockReturnValue([[], true, undefined] as [PodKind[], boolean, Error | undefined]);
  });

  it('should skip secondary resource watches when no NIM services are returned', () => {
    const renderResult = testHook(useWatchDeployments)(mockProject, undefined, undefined);

    const [deployments, loaded, errors] = renderResult.result.current as DeploymentHookResult;

    expect(deployments).toHaveLength(0);
    expect(loaded).toBe(true);
    expect(errors).toHaveLength(0);
    expect(deploymentWatchModule.useWatchInferenceServices).toHaveBeenCalledWith(
      mockProject,
      undefined,
      false,
    );
    expect(deploymentWatchModule.useWatchNIMDeploymentPods).toHaveBeenCalledWith(
      mockProject,
      undefined,
      false,
    );
  });
});

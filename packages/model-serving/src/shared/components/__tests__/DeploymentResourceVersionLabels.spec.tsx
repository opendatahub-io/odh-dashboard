import React from 'react';
import { render, screen } from '@testing-library/react';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import {
  RUNTIME_VERSION_ANNOTATION,
  FAST_VERSION_ANNOTATION,
  SUPPORT_STATUS_ANNOTATION,
} from '../../../concepts/versions';
import DeploymentResourceVersionLabels from '../DeploymentResourceVersionLabels';

const makeResource = (annotations?: Record<string, string>): K8sResourceCommon => ({
  apiVersion: 'v1',
  kind: 'LLMInferenceServiceConfig',
  metadata: { name: 'test', annotations },
});

const makeTemplate = (
  outerAnnotations?: Record<string, string>,
  innerAnnotations?: Record<string, string>,
): TemplateKind => ({
  apiVersion: 'template.openshift.io/v1',
  kind: 'Template',
  metadata: {
    name: 'test-template',
    namespace: 'opendatahub',
    ...(outerAnnotations ? { annotations: outerAnnotations } : {}),
  },
  objects: [
    {
      apiVersion: 'serving.kserve.io/v1alpha1',
      kind: 'ServingRuntime',
      metadata: {
        name: 'test-sr',
        ...(innerAnnotations ? { annotations: innerAnnotations } : {}),
      },
    },
  ],
  parameters: [],
});

describe('DeploymentResourceVersionLabels', () => {
  it('should render nothing when resource has no relevant annotations', () => {
    const { container } = render(<DeploymentResourceVersionLabels resource={makeResource()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render the version label', () => {
    render(
      <DeploymentResourceVersionLabels
        resource={makeResource({ [RUNTIME_VERSION_ANNOTATION]: '0.11.0' })}
      />,
    );
    expect(screen.getByTestId('serving-runtime-version-label')).toHaveTextContent('0.11.0');
  });

  it('should render the fast-version label', () => {
    render(
      <DeploymentResourceVersionLabels
        resource={makeResource({ [FAST_VERSION_ANNOTATION]: '1' })}
      />,
    );
    expect(screen.getByTestId('fast-version-label')).toHaveTextContent('fast-1');
  });

  it('should render the limited support label', () => {
    render(
      <DeploymentResourceVersionLabels
        resource={makeResource({ [SUPPORT_STATUS_ANNOTATION]: 'unsupported' })}
      />,
    );
    expect(screen.getByTestId('limited-support-label')).toHaveTextContent('Limited support');
  });

  it('should render all badges in correct order', () => {
    render(
      <DeploymentResourceVersionLabels
        resource={makeResource({
          [SUPPORT_STATUS_ANNOTATION]: 'unsupported',
          [RUNTIME_VERSION_ANNOTATION]: '0.11.0',
          [FAST_VERSION_ANNOTATION]: '2',
        })}
      />,
    );
    const limitedSupport = screen.getByTestId('limited-support-label');
    const version = screen.getByTestId('serving-runtime-version-label');
    const fastVersion = screen.getByTestId('fast-version-label');
    expect(limitedSupport).toBeInTheDocument();
    expect(version).toBeInTheDocument();
    expect(fastVersion).toBeInTheDocument();

    const labels = screen.getAllByTestId(
      /limited-support-label|serving-runtime-version-label|fast-version-label/,
    );
    expect(labels[0]).toBe(limitedSupport);
    expect(labels[1]).toBe(version);
    expect(labels[2]).toBe(fastVersion);
  });

  it('should render all badges when isEditing is true', () => {
    render(
      <DeploymentResourceVersionLabels
        resource={makeResource({
          [SUPPORT_STATUS_ANNOTATION]: 'unsupported',
          [FAST_VERSION_ANNOTATION]: '1',
        })}
        isEditing
      />,
    );
    expect(screen.getByTestId('limited-support-label')).toBeInTheDocument();
    expect(screen.getByTestId('fast-version-label')).toBeInTheDocument();
  });

  it('should not render limited support label for supported resources', () => {
    render(
      <DeploymentResourceVersionLabels
        resource={makeResource({ [RUNTIME_VERSION_ANNOTATION]: '0.11.0' })}
      />,
    );
    expect(screen.queryByTestId('limited-support-label')).not.toBeInTheDocument();
    expect(screen.getByTestId('serving-runtime-version-label')).toBeInTheDocument();
  });

  it('should render badges from a Template inner resource annotations', () => {
    render(
      <DeploymentResourceVersionLabels
        resource={makeTemplate(undefined, {
          [RUNTIME_VERSION_ANNOTATION]: '0.11.0+rhai5',
          [FAST_VERSION_ANNOTATION]: '1',
          [SUPPORT_STATUS_ANNOTATION]: 'unsupported',
        })}
      />,
    );
    expect(screen.getByTestId('serving-runtime-version-label')).toHaveTextContent('0.11.0+rhai5');
    expect(screen.getByTestId('fast-version-label')).toHaveTextContent('fast-1');
    expect(screen.getByTestId('limited-support-label')).toHaveTextContent('Limited support');
  });
});

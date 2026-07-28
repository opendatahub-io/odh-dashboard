import React from 'react';
import { render, screen } from '@testing-library/react';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import {
  RUNTIME_VERSION_ANNOTATION,
  FAST_VERSION_ANNOTATION,
  SUPPORT_STATUS_ANNOTATION,
} from '../../../concepts/versions';
import { renderDeploymentResourceVersionLabels } from '../renderDeploymentResourceVersionLabels';

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

describe('renderDeploymentResourceVersionLabels', () => {
  it('should return an empty array when resource has no relevant annotations', () => {
    expect(renderDeploymentResourceVersionLabels(makeResource())).toHaveLength(0);
  });

  it('should render the version label', () => {
    const labels = renderDeploymentResourceVersionLabels(
      makeResource({ [RUNTIME_VERSION_ANNOTATION]: '0.11.0' }),
    );
    render(<>{labels}</>);
    expect(screen.getByTestId('serving-runtime-version-label')).toHaveTextContent('0.11.0');
  });

  it('should render the fast-version label', () => {
    const labels = renderDeploymentResourceVersionLabels(
      makeResource({ [FAST_VERSION_ANNOTATION]: '1' }),
    );
    render(<>{labels}</>);
    expect(screen.getByTestId('fast-version-label')).toHaveTextContent('fast-1');
  });

  it('should render the limited support label', () => {
    const labels = renderDeploymentResourceVersionLabels(
      makeResource({ [SUPPORT_STATUS_ANNOTATION]: 'unsupported' }),
    );
    render(<>{labels}</>);
    expect(screen.getByTestId('limited-support-label')).toHaveTextContent('Limited support');
  });

  it('should render all labels in correct order', () => {
    const labels = renderDeploymentResourceVersionLabels(
      makeResource({
        [SUPPORT_STATUS_ANNOTATION]: 'unsupported',
        [RUNTIME_VERSION_ANNOTATION]: '0.11.0',
        [FAST_VERSION_ANNOTATION]: '2',
      }),
    );
    render(<>{labels}</>);

    const rendered = screen.getAllByTestId(
      /limited-support-label|serving-runtime-version-label|fast-version-label/,
    );
    expect(rendered[0]).toBe(screen.getByTestId('limited-support-label'));
    expect(rendered[1]).toBe(screen.getByTestId('serving-runtime-version-label'));
    expect(rendered[2]).toBe(screen.getByTestId('fast-version-label'));
  });

  it('should not render limited support label for supported resources', () => {
    const labels = renderDeploymentResourceVersionLabels(
      makeResource({ [RUNTIME_VERSION_ANNOTATION]: '0.11.0' }),
    );
    render(<>{labels}</>);
    expect(screen.queryByTestId('limited-support-label')).not.toBeInTheDocument();
    expect(screen.getByTestId('serving-runtime-version-label')).toBeInTheDocument();
  });

  it('should render labels from a Template inner resource annotations', () => {
    const labels = renderDeploymentResourceVersionLabels(
      makeTemplate(undefined, {
        [RUNTIME_VERSION_ANNOTATION]: '0.11.0+rhai5',
        [FAST_VERSION_ANNOTATION]: '1',
        [SUPPORT_STATUS_ANNOTATION]: 'unsupported',
      }),
    );
    render(<>{labels}</>);
    expect(screen.getByTestId('serving-runtime-version-label')).toHaveTextContent('0.11.0+rhai5');
    expect(screen.getByTestId('fast-version-label')).toHaveTextContent('fast-1');
    expect(screen.getByTestId('limited-support-label')).toHaveTextContent('Limited support');
  });

  it('should use a custom getVersion function when provided', () => {
    const labels = renderDeploymentResourceVersionLabels(makeResource(), {
      getVersion: () => '42.0.0',
    });
    render(<>{labels}</>);
    expect(screen.getByTestId('serving-runtime-version-label')).toHaveTextContent('42.0.0');
  });

  it('should assign unique keys to each label', () => {
    const labels = renderDeploymentResourceVersionLabels(
      makeResource({
        [SUPPORT_STATUS_ANNOTATION]: 'unsupported',
        [RUNTIME_VERSION_ANNOTATION]: '0.11.0',
        [FAST_VERSION_ANNOTATION]: '2',
      }),
    );
    const keys = labels.map((label) => label.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

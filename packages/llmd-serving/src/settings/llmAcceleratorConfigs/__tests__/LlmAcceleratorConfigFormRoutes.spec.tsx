import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';
import LlmAcceleratorConfigFormRoutes from '../LlmAcceleratorConfigFormRoutes';
import { LLM_ACCELERATOR_CONFIGS_TAB_PATH } from '../paths';

jest.mock('../../LlmInferenceServiceConfigAccessGate', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../LlmAcceleratorConfigContext', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="context-provider">{children}</div>
  ),
}));

jest.mock('../LlmAcceleratorConfigAddForm', () => ({
  __esModule: true,
  default: ({ mode }: { mode: string }) => <div data-testid="add-form" data-mode={mode} />,
  LlmAcceleratorConfigFormByName: ({ mode }: { mode: string }) => (
    <div data-testid="form-by-name" data-mode={mode} />
  ),
}));

/**
 * Mounts the component the way the host mounts an `app.route` extension: a single
 * top-level route whose path is the extension's exact registered path. This is the
 * detail that matters — the outer route consumes the whole pathname, so anything
 * the component does internally has to cope with an empty remaining path.
 */
const renderAtRoute = (registeredPath: string, url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={registeredPath} element={<LlmAcceleratorConfigFormRoutes />} />
      </Routes>
    </MemoryRouter>,
  );

describe('LlmAcceleratorConfigFormRoutes', () => {
  it('should render the add form when mounted at the registered add path', () => {
    renderAtRoute(
      `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/add`,
      `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/add`,
    );

    const form = screen.getByTestId('add-form');
    expect(form).toHaveAttribute('data-mode', 'add');
  });

  it('should render the edit form when mounted at the registered edit path', () => {
    renderAtRoute(
      `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/edit/:configName`,
      `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/edit/vllm-cuda`,
    );

    const form = screen.getByTestId('form-by-name');
    expect(form).toHaveAttribute('data-mode', 'edit');
  });

  it('should render the duplicate form when mounted at the registered duplicate path', () => {
    renderAtRoute(
      `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/duplicate/:configName`,
      `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/duplicate/vllm-cuda`,
    );

    const form = screen.getByTestId('form-by-name');
    expect(form).toHaveAttribute('data-mode', 'duplicate');
  });

  it('should wrap the form in the config context provider', () => {
    renderAtRoute(
      `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/add`,
      `${LLM_ACCELERATOR_CONFIGS_TAB_PATH}/add`,
    );

    expect(screen.getByTestId('context-provider')).toContainElement(screen.getByTestId('add-form'));
  });
});

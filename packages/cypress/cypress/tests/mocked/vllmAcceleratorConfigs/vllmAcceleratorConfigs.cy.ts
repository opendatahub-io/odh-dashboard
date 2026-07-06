import { vllmAcceleratorConfigsIntercept } from './vllmAcceleratorConfigsUtils';
import { vllmAcceleratorConfigs } from '../../../pages/vllmAcceleratorConfigs';
import { asProductAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';
import { pageNotfound } from '../../../pages/pageNotFound';

it('vLLM accelerator configurations should not be available for non product admins', () => {
  asProjectAdminUser();
  vllmAcceleratorConfigs.visit(false);
  pageNotfound.findPage().should('exist');
  vllmAcceleratorConfigs.findNavItem().should('not.exist');
});

describe('vLLM accelerator configurations', () => {
  beforeEach(() => {
    asProductAdminUser();
    vllmAcceleratorConfigsIntercept();

    vllmAcceleratorConfigs.visit();
  });

  it('should display table with correct config names', () => {
    vllmAcceleratorConfigs
      .getRowByName('vllm-cuda')
      .find()
      .should('exist')
      .should('contain.text', 'vLLM CUDA Accelerator');
    vllmAcceleratorConfigs
      .getRowByName('vllm-rocm')
      .find()
      .should('exist')
      .should('contain.text', 'vLLM ROCm Accelerator');
    vllmAcceleratorConfigs
      .getRowByName('vllm-cpu')
      .find()
      .should('exist')
      .should('contain.text', 'vLLM CPU Accelerator');
  });

  it('should display pre-installed label on ROCm config', () => {
    vllmAcceleratorConfigs.getRowByName('vllm-rocm').shouldHavePreInstalledLabel(true);
    vllmAcceleratorConfigs.getRowByName('vllm-cuda').shouldHavePreInstalledLabel(false);
    vllmAcceleratorConfigs.getRowByName('vllm-cpu').shouldHavePreInstalledLabel(false);
  });

  it('should display unsupported label on TPU config', () => {
    vllmAcceleratorConfigs.getRowByName('vllm-tpu').shouldHaveUnsupportedLabel(true);
    vllmAcceleratorConfigs.getRowByName('vllm-cuda').shouldHaveUnsupportedLabel(false);
  });

  it('should display enabled toggle reflecting config state', () => {
    vllmAcceleratorConfigs.getRowByName('vllm-cuda').shouldBeEnabled(true);
    vllmAcceleratorConfigs.getRowByName('vllm-rocm').shouldBeEnabled(true);
    vllmAcceleratorConfigs.getRowByName('vllm-cpu').shouldBeEnabled(false);
  });
});

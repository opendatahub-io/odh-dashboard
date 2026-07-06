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

  it('should render the page with configs from the API', () => {
    vllmAcceleratorConfigs.findNavItem().should('exist');
    vllmAcceleratorConfigs.getRowByName('vllm-cuda').find().should('exist');
    vllmAcceleratorConfigs.getRowByName('vllm-rocm').find().should('exist');
    vllmAcceleratorConfigs.getRowByName('vllm-cpu').find().should('exist');
    vllmAcceleratorConfigs.getRowByName('vllm-tpu').find().should('exist');
  });
});

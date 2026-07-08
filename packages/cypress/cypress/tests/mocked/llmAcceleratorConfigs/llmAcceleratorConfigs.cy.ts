import { llmAcceleratorConfigsIntercept } from './llmAcceleratorConfigsUtils';
import { llmAcceleratorConfigs } from '../../../pages/llmAcceleratorConfigs';
import { asProductAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';
import { pageNotfound } from '../../../pages/pageNotFound';

it('LLM accelerator configurations should not be available for non product admins', () => {
  asProjectAdminUser();
  llmAcceleratorConfigs.visit(false);
  pageNotfound.findPage().should('exist');
  llmAcceleratorConfigs.findNavItem().should('not.exist');
});

describe('LLM accelerator configurations', () => {
  beforeEach(() => {
    asProductAdminUser();
    llmAcceleratorConfigsIntercept();

    llmAcceleratorConfigs.visit();
  });

  it('should render the page with configs from the API', () => {
    llmAcceleratorConfigs.findNavItem().should('exist');
    llmAcceleratorConfigs.getRowByName('vllm-cuda').find().should('exist');
    llmAcceleratorConfigs.getRowByName('vllm-rocm').find().should('exist');
    llmAcceleratorConfigs.getRowByName('vllm-cpu').find().should('exist');
    llmAcceleratorConfigs.getRowByName('vllm-tpu').find().should('exist');
  });
});

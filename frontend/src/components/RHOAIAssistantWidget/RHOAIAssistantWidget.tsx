import * as React from 'react';
import {
  Button,
  TextArea,
  Panel,
  PanelMain,
  PanelMainBody,
  PanelHeader,
  PanelFooter,
  Title,
  Flex,
  FlexItem,
  Label,
  Stack,
  StackItem,
  Spinner,
} from '@patternfly/react-core';
import { TimesIcon, PaperPlaneIcon, CommentDotsIcon } from '@patternfly/react-icons';
import { useLocation } from 'react-router-dom';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import './RHOAIAssistantWidget.scss';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PageContext {
  pathname: string;
  pageName: string;
}

const getPageName = (pathname: string): string => {
  if (pathname.includes('/projects')) {
    return 'Data Science Projects';
  }
  if (pathname.includes('/modelServing')) {
    return 'Model Serving';
  }
  if (pathname.includes('/pipelines')) {
    return 'Data Science Pipelines';
  }
  if (pathname.includes('/modelCatalog')) {
    return 'Model Catalog';
  }
  if (pathname.includes('/workbenches')) {
    return 'Workbenches';
  }
  if (pathname.includes('/settings')) {
    return 'Settings';
  }
  if (pathname.includes('/gen-ai-studio')) {
    return 'Gen AI Studio';
  }
  if (pathname.includes('/ai-hub')) {
    return 'AI Hub';
  }
  return 'Home';
};

// Placeholder responses until MCP/LLM is wired up by the next team member
const getAssistantResponse = (input: string, context: PageContext): string => {
  const lowerInput = input.toLowerCase();

  if (lowerInput.includes('workbench') || lowerInput.includes('notebook')) {
    return `To create a workbench:\n\n1. Go to Data Science Projects\n2. Select or create a project\n3. Click "Create workbench"\n4. Choose your notebook image (e.g., Standard Data Science, PyTorch, TensorFlow)\n5. Configure compute resources (CPU, memory, GPU)\n6. Add storage if needed\n\nWould you like me to help with any specific step?`;
  }

  if (lowerInput.includes('project')) {
    return `To create a Data Science Project:\n\n1. Navigate to "Data Science Projects" in the left menu\n2. Click "Create data science project"\n3. Enter a name and optional description\n4. Click "Create"\n\nYour project provides a namespace for workbenches, pipelines, model servers, and data connections.`;
  }

  if (lowerInput.includes('model') && lowerInput.includes('deploy')) {
    return `To deploy a model:\n\n1. Go to your Data Science Project\n2. Click "Deploy model" in the Models section\n3. Choose a model server:\n   • Single-model (KServe) - one model per server\n   • Multi-model (ModelMesh) - multiple models per server\n4. Configure the runtime and resources\n5. Provide model location (S3, PVC, or Model Registry)\n\nNeed help choosing a deployment type?`;
  }

  if (lowerInput.includes('pipeline')) {
    return `To create a Data Science Pipeline:\n\n1. Open your Data Science Project\n2. Go to the Pipelines section\n3. Import a pipeline from YAML or create one using:\n   • Kubeflow Pipelines SDK\n   • Elyra visual pipeline editor\n4. Configure pipeline parameters\n5. Create a run to execute the pipeline\n\nPipelines help automate your ML workflows end-to-end.`;
  }

  if (lowerInput.includes('model catalog') || lowerInput.includes('catalog')) {
    return `The Model Catalog lets you:\n\n• Browse pre-trained models from Red Hat and partners\n• Deploy models directly to your projects\n• Access foundation models like Granite\n\nGo to "Model Catalog" in the left menu to explore available models.`;
  }

  if (
    lowerInput.includes('gen ai') ||
    lowerInput.includes('llm') ||
    lowerInput.includes('large language')
  ) {
    return `Gen AI workloads are supported:\n\n• **Model Catalog**: Browse and deploy LLMs like Granite\n• **Gen AI Studio**: Interactive playground for LLM testing\n• **vLLM/TGI**: High-performance inference serving\n• **Llama Stack**: Standardized API for LLM operations\n\nCheck "AI Hub" in the menu for Gen AI features.`;
  }

  return `I'm your ${ODH_PRODUCT_NAME} assistant. I can help you with:\n\n• Creating workbenches and Jupyter notebooks\n• Setting up data science projects\n• Deploying and serving ML models\n• Building data science pipelines\n• Using the Model Catalog\n• Gen AI and LLM workloads\n\nYou're currently viewing: **${context.pageName}**\n\nWhat would you like to know?`;
};

const RHOAIAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const location = useLocation();
  const pageContext: PageContext = {
    pathname: location.pathname,
    pageName: getPageName(location.pathname),
  };

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = React.useCallback(async () => {
    if (!inputValue.trim()) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // TODO: Replace with actual BFF call to /rhoai-assistant/api/chat
    // The next team member will wire this up to the MCP server
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 800);
    });

    const response = getAssistantResponse(userMessage.content, pageContext);

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  }, [inputValue, pageContext]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="rhoai-assistant-overlay">
      {/* Toggle Button */}
      <Button
        variant="primary"
        className={`rhoai-assistant-toggle ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`${ODH_PRODUCT_NAME} Assistant`}
      >
        {isOpen ? <TimesIcon /> : <CommentDotsIcon />}
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <Panel className="rhoai-assistant-panel">
          <PanelHeader>
            <Flex
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                <Title headingLevel="h3" size="md">
                  {ODH_PRODUCT_NAME} Assistant
                </Title>
              </FlexItem>
              <FlexItem>
                <Label color="blue" isCompact>
                  {pageContext.pageName}
                </Label>
              </FlexItem>
            </Flex>
          </PanelHeader>

          <PanelMain>
            <PanelMainBody className="rhoai-assistant-messages">
              {messages.length === 0 && (
                <div className="rhoai-assistant-welcome">
                  <Title headingLevel="h4" size="lg">
                    Welcome! 👋
                  </Title>
                  <p>
                    I&apos;m your {ODH_PRODUCT_NAME} assistant. Ask me anything about the platform.
                  </p>
                  <Stack hasGutter className="rhoai-assistant-suggestions">
                    <StackItem>
                      <Button
                        variant="tertiary"
                        isBlock
                        onClick={() => setInputValue('How do I create a workbench?')}
                      >
                        How do I create a workbench?
                      </Button>
                    </StackItem>
                    <StackItem>
                      <Button
                        variant="tertiary"
                        isBlock
                        onClick={() => setInputValue('How do I deploy a model?')}
                      >
                        How do I deploy a model?
                      </Button>
                    </StackItem>
                    <StackItem>
                      <Button
                        variant="tertiary"
                        isBlock
                        onClick={() => setInputValue('Tell me about Gen AI features')}
                      >
                        Tell me about Gen AI features
                      </Button>
                    </StackItem>
                  </Stack>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`rhoai-assistant-message ${msg.role}`}>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}

              {isLoading && (
                <div className="rhoai-assistant-message assistant">
                  <Spinner size="sm" /> Thinking...
                </div>
              )}

              <div ref={messagesEndRef} />
            </PanelMainBody>
          </PanelMain>

          <PanelFooter className="rhoai-assistant-input">
            <Flex>
              <FlexItem grow={{ default: 'grow' }}>
                <TextArea
                  value={inputValue}
                  onChange={(_e, val) => setInputValue(val)}
                  onKeyDown={handleKeyPress}
                  placeholder={`Ask about ${ODH_PRODUCT_NAME}...`}
                  aria-label="Message input"
                  rows={1}
                  autoResize
                />
              </FlexItem>
              <FlexItem>
                <Button
                  variant="primary"
                  onClick={handleSend}
                  isDisabled={!inputValue.trim() || isLoading}
                  aria-label="Send"
                >
                  <PaperPlaneIcon />
                </Button>
              </FlexItem>
            </Flex>
          </PanelFooter>
        </Panel>
      )}
    </div>
  );
};

export default RHOAIAssistantWidget;

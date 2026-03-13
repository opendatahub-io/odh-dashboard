import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  Progress,
  ProgressMeasureLocation,
  Radio,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';

type ScoreEntry = { mean: number; ci_low: number; ci_high: number };

type PatternData = {
  name: string;
  settings: Record<string, Record<string, unknown>>;
  scores: Record<string, ScoreEntry>;
  [key: string]: unknown;
};

type PatternDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  data: PatternData;
};

const OVERVIEW_KEY = 'pattern_information';

const humanize = (key: string): string =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const isScoreEntry = (value: unknown): value is ScoreEntry =>
  typeof value === 'object' &&
  value !== null &&
  'mean' in value &&
  'ci_low' in value &&
  'ci_high' in value;

const KeyValueList: React.FC<{ entries: Record<string, unknown> }> = ({ entries }) => (
  <DescriptionList isHorizontal>
    {Object.entries(entries).map(([key, value]) => (
      <DescriptionListGroup key={key}>
        <DescriptionListTerm>{humanize(key)}</DescriptionListTerm>
        <DescriptionListDescription>{String(value)}</DescriptionListDescription>
      </DescriptionListGroup>
    ))}
  </DescriptionList>
);

type ScoreType = 'mean' | 'ci_high' | 'ci_low';

/* eslint-disable camelcase */
const scoreTypeLabels: Record<ScoreType, string> = {
  mean: 'Mean',
  ci_high: 'CI High',
  ci_low: 'CI Low',
};
/* eslint-enable camelcase */

const ScoresList: React.FC<{ scores: Record<string, ScoreEntry>; scoreType: ScoreType }> = ({
  scores,
  scoreType,
}) => (
  <DescriptionList isHorizontal>
    {Object.entries(scores).map(([key, score]) => {
      const value = score[scoreType];
      return (
        <DescriptionListGroup key={key}>
          <DescriptionListTerm>
            {humanize(key)} ({scoreTypeLabels[scoreType]})
          </DescriptionListTerm>
          <DescriptionListDescription style={{ minWidth: 300 }}>
            <Progress
              value={value * 100}
              title=""
              label={`${value.toFixed(3)}`}
              measureLocation={ProgressMeasureLocation.outside}
            />
          </DescriptionListDescription>
        </DescriptionListGroup>
      );
    })}
  </DescriptionList>
);

const PatternDetailsModal: React.FC<PatternDetailsModalProps> = ({ isOpen, onClose, data }) => {
  const [activeSection, setActiveSection] = React.useState<string>(OVERVIEW_KEY);
  const [scoreType, setScoreType] = React.useState<ScoreType>('mean');

  const settingsKeys = Object.keys(data.settings);
  const allSections = [OVERVIEW_KEY, ...settingsKeys];

  const topLevelFields = Object.entries(data).reduce<Record<string, unknown>>((acc, [key, val]) => {
    if (key !== 'settings' && key !== 'scores' && !isScoreEntry(val)) {
      acc[key] = val;
    }
    return acc;
  }, {});

  const renderContent = (): React.ReactNode => {
    if (activeSection === OVERVIEW_KEY) {
      return (
        <>
          <KeyValueList entries={topLevelFields} />
          <DescriptionList isHorizontal style={{ marginTop: 16 }}>
            <DescriptionListGroup>
              <DescriptionListTerm>Score type</DescriptionListTerm>
              <DescriptionListDescription>
                <Flex gap={{ default: 'gapLg' }}>
                  {(['mean', 'ci_high', 'ci_low'] satisfies ScoreType[]).map((type) => (
                    <FlexItem key={type}>
                      <Radio
                        id={`score-type-${type}`}
                        name="score-type"
                        label={scoreTypeLabels[type]}
                        isChecked={scoreType === type}
                        onChange={() => setScoreType(type)}
                      />
                    </FlexItem>
                  ))}
                </Flex>
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
          <Title headingLevel="h4" style={{ marginTop: 24 }}>
            Scores
          </Title>
          <ScoresList scores={data.scores} scoreType={scoreType} />
        </>
      );
    }
    return <KeyValueList entries={data.settings[activeSection]} />;
  };

  const getTabLabel = (key: string): string =>
    key === OVERVIEW_KEY ? 'Pattern information' : humanize(key);

  return (
    <Modal variant={ModalVariant.large} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title={`Pattern details — ${data.name}`} />
      <ModalBody>
        <Flex>
          <FlexItem>
            <Tabs
              activeKey={activeSection}
              onSelect={(_e, key) => setActiveSection(String(key))}
              isVertical
              aria-label="Pattern detail sections"
            >
              {allSections.map((key) => (
                <Tab
                  key={key}
                  eventKey={key}
                  title={<TabTitleText>{getTabLabel(key)}</TabTitleText>}
                />
              ))}
            </Tabs>
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>{renderContent()}</FlexItem>
        </Flex>
      </ModalBody>
    </Modal>
  );
};

export default PatternDetailsModal;

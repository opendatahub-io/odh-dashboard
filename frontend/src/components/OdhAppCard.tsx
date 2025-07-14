import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertVariant,
  Button,
  capitalize,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Dropdown,
  DropdownItem,
  DropdownList,
  Label,
  MenuToggle,
  Popover,
  Tooltip,
} from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import { EllipsisVIcon, ExclamationCircleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { OdhApplication } from '#~/types';
import { getLaunchStatus, launchQuickStart } from '#~/utilities/quickStartUtils';
import EnableModal from '#~/pages/exploreApplication/EnableModal';
import { removeComponent } from '#~/services/componentsServices';
import { addNotification, forceComponentsUpdate } from '#~/redux/actions/actions';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import { useAppContext } from '#~/app/AppContext';
import { useAppDispatch } from '#~/redux/hooks';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { isInternalRouteIntegrationsApp } from '#~/utilities/utils';
import { deleteIntegrationApp } from '#~/services/integrationAppService';
import { useUser } from '#~/redux/selectors';
import { useQuickStartCardSelected } from './useQuickStartCardSelected';
import SupportedAppTitle from './SupportedAppTitle';
import BrandImage from './BrandImage';
import './OdhCard.scss';

type OdhAppCardProps = {
  odhApp: OdhApplication;
};

const OdhAppCard: React.FC<OdhAppCardProps> = ({ odhApp }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [enableOpen, setEnableOpen] = React.useState(false);
  const [qsContext, selected] = useQuickStartCardSelected(
    odhApp.spec.quickStart,
    odhApp.metadata.name,
  );
  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;
  const disabled = !odhApp.spec.isEnabled;
  const { dashboardConfig } = useAppContext();
  const dispatch = useAppDispatch();
  const { isAdmin } = useUser();

  const onOpenKebab = () => {
    setIsOpen(!isOpen);
  };

  const onQuickStart = (e: React.SyntheticEvent | Event) => {
    e.preventDefault();
    launchQuickStart(odhApp.spec.quickStart, qsContext);
  };

  const removeApplication = () => {
    const handleSuccess = () => {
      dispatch(
        addNotification({
          status: AlertVariant.success,
          title: `${odhApp.metadata.name} has been removed from the Enabled page.`,
          timestamp: new Date(),
        }),
      );
      dispatch(forceComponentsUpdate());
    };

    const handleError = (e: Error) => {
      dispatch(
        addNotification({
          status: AlertVariant.danger,
          title: `Error attempting to remove ${odhApp.metadata.name}.`,
          message: e.message,
          timestamp: new Date(),
        }),
      );
    };

    if (isInternalRouteIntegrationsApp(odhApp.spec.internalRoute)) {
      deleteIntegrationApp(odhApp.spec.internalRoute)
        .then((response) => {
          if (response.success) {
            handleSuccess();
          } else {
            throw new Error(response.error);
          }
        })
        .catch(handleError);
    } else {
      removeComponent(odhApp.metadata.name)
        .then((response) => {
          if (response.success) {
            handleSuccess();
          } else {
            throw new Error(response.error);
          }
        })
        .catch(handleError);
    }
  };

  const dropdownItems = [
    <DropdownItem
      isExternalLink
      key="docs"
      to={odhApp.spec.docsLink}
      target="_blank"
      rel="noopener noreferrer"
    >
      View documentation
    </DropdownItem>,
  ];

  if (odhApp.spec.quickStart) {
    dropdownItems.push(
      <DropdownItem key="quick-start" onClick={onQuickStart}>
        {`${getLaunchStatus(odhApp.spec.quickStart || '', qsContext)} quick start`}
      </DropdownItem>,
    );
  }

  const launchClasses = css(
    'odh-card__footer__link',
    !odhApp.spec.link && 'm-hidden',
    (disabled || !workbenchEnabled) && 'm-disabled',
  );

  const cardFooter = (
    <CardFooter className="odh-card__footer">
      {odhApp.metadata.name === 'jupyter' ? (
        odhApp.spec.internalRoute ? (
          <Link
            data-testid="jupyter-app-link"
            to="/notebookController"
            className={css('odh-card__footer__link', !workbenchEnabled && 'm-disabled')}
          >
            Open application
          </Link>
        ) : null
      ) : (
        <a
          className={launchClasses}
          href={odhApp.spec.link || '#'}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open application
          <ExternalLinkAltIcon />
        </a>
      )}
    </CardFooter>
  );

  const cardClasses = css('odh-card', selected && 'pf-m-current');

  const popoverBodyContent = (hide: () => void) => (
    <div>
      {isInternalRouteIntegrationsApp(odhApp.spec.internalRoute) && odhApp.spec.error && (
        <>{`${capitalize(odhApp.spec.error)}.`}</>
      )}
      <p>
        Subscription is no longer valid. To validate click&nbsp;
        <Button
          isInline
          variant="link"
          onClick={() => {
            hide();
            setEnableOpen(true);
          }}
        >
          here
        </Button>
        . To remove card click&nbsp;
        <Button
          isInline
          variant="link"
          onClick={() => {
            hide();
            removeApplication();
          }}
        >
          here
        </Button>
        .
      </p>
    </div>
  );

  const disableButton = (
    <Button variant="link" className="odh-card__disabled-text" isDisabled={!isAdmin}>
      Disabled
    </Button>
  );

  const disabledContent = !isAdmin ? (
    <Tooltip content="To enable this application, contact your administrator.">
      <span>{disableButton}</span>
    </Tooltip>
  ) : (
    <Popover
      headerContent={
        <div className="odh-card__disabled-popover-title">
          Enable {odhApp.spec.displayName} failed
        </div>
      }
      bodyContent={popoverBodyContent}
      position="right"
      headerIcon={<ExclamationCircleIcon />}
      alertSeverityVariant="danger"
    >
      {disableButton}
    </Popover>
  );

  return (
    <Card
      component="div"
      data-testid={`card ${odhApp.metadata.name}`}
      id={odhApp.metadata.name}
      role="listitem"
      className={cardClasses}
      isDisabled={disabled || !workbenchEnabled}
    >
      <CardHeader
        actions={{
          actions: (
            <>
              {disabled ? disabledContent : null}
              <Dropdown
                onSelect={onOpenKebab}
                onOpenChange={(isOpened) => setIsOpen(isOpened)}
                toggle={(toggleRef) => (
                  <MenuToggle
                    variant="plain"
                    aria-label="Actions"
                    ref={toggleRef}
                    onClick={() => setIsOpen(!isOpen)}
                    isExpanded={isOpen}
                  >
                    <EllipsisVIcon />
                  </MenuToggle>
                )}
                isOpen={isOpen}
                popperProps={{ position: 'right' }}
              >
                <DropdownList>{dropdownItems}</DropdownList>
              </Dropdown>
            </>
          ),
          hasNoOffset: true,
          className: undefined,
        }}
      >
        <BrandImage src={odhApp.spec.img} alt="" data-testid="brand-image" />
      </CardHeader>
      <SupportedAppTitle odhApp={odhApp} />
      <CardBody>
        {!dashboardConfig.spec.dashboardConfig.disableISVBadges &&
        odhApp.spec.category &&
        odhApp.spec.support !== ODH_PRODUCT_NAME ? (
          <div className="odh-card__partner-badge-container">
            <span
              className={css('odh-card__partner-badge', disabled && 'pf-m-disabled')}
              data-testid="partner-badge"
            >
              <Label variant="outline">{odhApp.spec.category}</Label>
            </span>
          </div>
        ) : null}
        <span className="odh-card__partner-badge-description" data-testid="badge-description">
          {odhApp.spec.description}
        </span>
      </CardBody>
      {cardFooter}
      {enableOpen && <EnableModal onClose={() => setEnableOpen(false)} selectedApp={odhApp} />}
    </Card>
  );
};

export default OdhAppCard;

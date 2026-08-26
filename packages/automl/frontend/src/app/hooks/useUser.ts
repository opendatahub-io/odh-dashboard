import { createUseUser } from '@odh-dashboard/autox-core/ui/hooks';
import { AppContext } from '~/app/context/AppContext';

const useUser = createUseUser(AppContext);

export default useUser;

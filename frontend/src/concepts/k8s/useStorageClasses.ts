import useFetchState from '~/utilities/useFetchState';
import { getStorageClasses } from '~/api';

const useStorageClasses = () => useFetchState(getStorageClasses, []);

export default useStorageClasses;

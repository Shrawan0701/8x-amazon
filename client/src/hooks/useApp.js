import { useContext } from 'react';
import { AppContext } from '../context/appContextValue';

export function useApp() {
  return useContext(AppContext);
}

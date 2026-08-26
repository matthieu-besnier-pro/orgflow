import { createContext, useContext } from 'react';

const ViewModeContext = createContext('standard');

export function ViewModeProvider({ children, mode }) {
  return <ViewModeContext.Provider value={mode}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
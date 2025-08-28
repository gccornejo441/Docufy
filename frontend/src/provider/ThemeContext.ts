import { createContext } from 'react';
import type { Theme, ResolvedTheme } from './theme.types';

export type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

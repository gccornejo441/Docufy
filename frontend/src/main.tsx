import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Theme } from '@radix-ui/themes';
import ThemeProvider from './provider/ThemeProvider.tsx';

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <StrictMode>
    <ThemeProvider defaultTheme="system">
      <Theme
        appearance="inherit"
        accentColor="mint"
        panelBackground="solid"
        radius="large"
        scaling="90%"
      >
        <App />
      </Theme>
    </ThemeProvider>
  </StrictMode>
);
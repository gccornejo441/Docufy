import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Theme } from '@radix-ui/themes';
import ThemeProvider from './provider/ThemeProvider.tsx';
import { MsalProvider } from '@azure/msal-react';
import { pca } from './auth/msal.ts';

const container = document.getElementById('root')!;
const root = createRoot(container);

async function bootstrap() {
  await pca.initialize();
  const accounts = pca.getAllAccounts();
  if (accounts.length && !pca.getActiveAccount()) {
    pca.setActiveAccount(accounts[0]);
  }

  root.render(
    <StrictMode>
      <MsalProvider instance={pca}>
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
      </MsalProvider>
    </StrictMode>
  );
}

bootstrap();

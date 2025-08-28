import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Theme } from '@radix-ui/themes'
import ThemeProvider from './provider/ThemeProvider.tsx'

createRoot(document.getElementById('root')!).render(
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
)

import { render } from 'preact';
import { App } from './App';
import { InstallBanner } from './install';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import './material';
import './style.css';

render(
  <>
    <App />
    <InstallBanner />
  </>,
  document.getElementById('app')!
);

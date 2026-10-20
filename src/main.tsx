import { render } from 'preact';
import { App } from './App';
import { InstallBanner } from './install';
import './style.css';

render(
  <>
    <App />
    <InstallBanner />
  </>,
  document.getElementById('app')!
);

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { applyThemeClass, getInitialThemeIsDark } from './components/BlindPullToggle';
import './index.css';

applyThemeClass(getInitialThemeIsDark());

createRoot(document.getElementById('root')!).render(<App />);

import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import Providers from '@/app/providers';
import '@/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Providers>
    <App />
  </Providers>,
);

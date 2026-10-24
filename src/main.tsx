import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AuthProvider, useAuth} from './auth/AuthContext';
import {LoginPage} from './components/LoginPage';
import './index.css';

function AuthGate() {
  const {user, ready} = useAuth();
  if (!ready) return null;
  return user ? <App /> : <LoginPage />;
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <AuthGate />
  </AuthProvider>,
);

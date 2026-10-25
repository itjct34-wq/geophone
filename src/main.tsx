import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AuthProvider, useAuth} from './auth/AuthContext';
import {LoginPage} from './components/LoginPage';
import {SharePage} from './components/SharePage';
import './index.css';

function AuthGate() {
  const {user, ready} = useAuth();
  if (!ready) return null;
  return user ? <App /> : <LoginPage />;
}

// A ?share=<token> link is opened by the person being asked to share their location.
// It needs no account, so it bypasses the sign-in gate.
const shareToken = new URLSearchParams(window.location.search).get('share');

createRoot(document.getElementById('root')!).render(
  shareToken ? (
    <SharePage token={shareToken} />
  ) : (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  ),
);

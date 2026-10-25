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

// A /s/<code> link (or the older ?share=<token> form) is opened by the person being asked
// to share their location. It needs no account, so it bypasses the sign-in gate.
const pathMatch = window.location.pathname.match(/^\/s\/([A-Za-z0-9]{6,80})\/?$/);
const shareToken = pathMatch?.[1] ?? new URLSearchParams(window.location.search).get('share');

createRoot(document.getElementById('root')!).render(
  shareToken ? (
    <SharePage token={shareToken} />
  ) : (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  ),
);

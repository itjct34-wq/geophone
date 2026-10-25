import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AuthProvider, useAuth} from './auth/AuthContext';
import {SharePage} from './components/SharePage';
import {TermsPage, PrivacyPage} from './components/LegalPage';
import './index.css';

// The app is public: logged-out visitors get the landing page and the free
// tools, and App itself shows the sign-in screen on demand. We only wait for
// the initial session check so the right header (Sign in vs Sign out) renders.
function AuthGate() {
  const {ready} = useAuth();
  if (!ready) return null;
  return <App />;
}

const path = window.location.pathname;

// A /s/<code> link (or the older ?share=<token> form) is opened by the person being asked
// to share their location. It needs no account, so it bypasses the sign-in gate.
const pathMatch = path.match(/^\/s\/([A-Za-z0-9]{6,80})\/?$/);
const shareToken = pathMatch?.[1] ?? new URLSearchParams(window.location.search).get('share');

// Terms and Privacy are public, readable without an account.
const root = createRoot(document.getElementById('root')!);
if (/^\/terms\/?$/.test(path)) {
  root.render(<TermsPage />);
} else if (/^\/privacy\/?$/.test(path)) {
  root.render(<PrivacyPage />);
} else if (shareToken) {
  root.render(<SharePage token={shareToken} />);
} else {
  root.render(
    <AuthProvider>
      <AuthGate />
    </AuthProvider>,
  );
}

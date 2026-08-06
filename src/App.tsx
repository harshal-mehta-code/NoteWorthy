import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { useStore } from '@/store/useStore';
import Welcome from '@/screens/Welcome';
import Home from '@/screens/Home';
import Practice from '@/screens/Practice';
import Summary from '@/screens/Summary';
import Settings from '@/screens/Settings';

/** Applies the theme choice, and keeps the browser chrome colour in step. */
function useTheme() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);

    const dark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#0A0B0D' : '#FAF9F7');
  }, [theme]);
}

/** Nobody reaches the app proper until they've been shown what it is. */
function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const done = useStore((s) => s.hasOnboarded);
  return done ? <>{children}</> : <Navigate to="/welcome" replace />;
}

export default function App() {
  useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route
          path="/"
          element={
            <RequireOnboarding>
              <Home />
            </RequireOnboarding>
          }
        />
        <Route
          path="/practice"
          element={
            <RequireOnboarding>
              <Practice />
            </RequireOnboarding>
          }
        />
        <Route
          path="/summary"
          element={
            <RequireOnboarding>
              <Summary />
            </RequireOnboarding>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireOnboarding>
              <Settings />
            </RequireOnboarding>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

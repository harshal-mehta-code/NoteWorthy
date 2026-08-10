import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { useStore } from '@/store/useStore';
import { TabBar } from '@/components/TabBar';
import Welcome from '@/screens/Welcome';
import Home from '@/screens/Home';
import PracticeLibrary from '@/screens/PracticeLibrary';
import Practice from '@/screens/Practice';
import Lesson from '@/screens/Lesson';
import LessonIndex from '@/screens/LessonIndex';
import Summary from '@/screens/Summary';
import You from '@/screens/You';
import Settings from '@/screens/Settings';
import VocalRange from '@/screens/VocalRange';

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

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const done = useStore((s) => s.hasOnboarded);
  return done ? <>{children}</> : <Navigate to="/welcome" replace />;
}

/**
 * Tabs wrap the browsing screens only. A drill, a lesson and the summary all
 * take the whole display — chrome during an exercise is the one thing the
 * design rules are unambiguous about (docs/07-UX-AND-LANGUAGE.md §1).
 */
function TabbedLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}

export default function App() {
  useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />

        <Route
          element={
            <RequireOnboarding>
              <TabbedLayout />
            </RequireOnboarding>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/practice" element={<PracticeLibrary />} />
          <Route path="/you" element={<You />} />
        </Route>

        <Route
          element={
            <RequireOnboarding>
              <Outlet />
            </RequireOnboarding>
          }
        >
          <Route path="/warmup" element={<Practice warmup />} />
          <Route path="/practice/:courseId" element={<Practice />} />
          <Route path="/learn" element={<LessonIndex />} />
          <Route path="/learn/:lessonId" element={<Lesson />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/voice/range" element={<VocalRange />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

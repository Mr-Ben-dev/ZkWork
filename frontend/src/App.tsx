import { FC, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const RegisterWorker = lazy(() => import('./pages/RegisterWorker').then((m) => ({ default: m.RegisterWorker })));
const JobBoard = lazy(() => import('./pages/JobBoard').then((m) => ({ default: m.JobBoard })));
const JobDetail = lazy(() => import('./pages/JobDetail').then((m) => ({ default: m.JobDetail })));
const PostJob = lazy(() => import('./pages/PostJob').then((m) => ({ default: m.PostJob })));
const Agreements = lazy(() => import('./pages/Agreements').then((m) => ({ default: m.Agreements })));
const AgreementDetail = lazy(() => import('./pages/AgreementDetail').then((m) => ({ default: m.AgreementDetail })));
const Reputation = lazy(() => import('./pages/Reputation').then((m) => ({ default: m.Reputation })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));

const PageLoader: FC = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <LoadingSpinner size={40} />
  </div>
);

const App: FC = () => (
  <Layout>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<RegisterWorker />} />
        <Route path="/jobs" element={<JobBoard />} />
        <Route path="/jobs/:commitment" element={<JobDetail />} />
        <Route path="/post-job" element={<PostJob />} />
        <Route path="/agreements" element={<Agreements />} />
        <Route path="/agreements/:commitment" element={<AgreementDetail />} />
        <Route path="/reputation" element={<Reputation />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  </Layout>
);

export default App;

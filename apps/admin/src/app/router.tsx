import { createBrowserRouter } from 'react-router-dom';
import { Result } from 'antd';
import { AdminLayout } from '../layouts/AdminLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PostsPage } from '../features/posts/PostsPage';
import { FeaturePlaceholder } from '../components/FeaturePlaceholder';
import { LoginPage } from '../features/auth/LoginPage';
import { RequireAuth } from '../features/auth/AuthProvider';
import { PostEditor } from '../features/posts/PostEditor';
import { MomentsPage } from '../features/moments/MomentsPage';
import { MomentEditor } from '../features/moments/MomentEditor';
import { MediaPage } from '../features/media/MediaPage';
import { TaxonomyPage } from '../features/taxonomy/TaxonomyPage';
import { PublishingPage } from '../features/publishing/PublishingPage';
import { AiPage } from '../features/ai/AiPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { element: <RequireAuth />, children: [
  {
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'posts', element: <PostsPage /> },
      { path: 'posts/new', element: <PostEditor /> },
      { path: 'posts/:id', element: <PostEditor /> },
      { path: 'moments', element: <MomentsPage /> },
      { path: 'moments/new', element: <MomentEditor /> },
      { path: 'moments/:id', element: <MomentEditor /> },
      { path: 'taxonomy', element: <TaxonomyPage /> },
      { path: 'media', element: <MediaPage /> },
      { path: 'publishing', element: <PublishingPage /> },
      { path: 'ai', element: <AiPage /> },
      { path: 'settings', element: <FeaturePlaceholder title="站点设置" description="管理站点标题、简介等配置。" /> },
      { path: '*', element: <Result status="404" title="404" subTitle="页面不存在" /> },
    ],
  },
  ] },
], { basename: '/admin' });

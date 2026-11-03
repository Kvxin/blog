import {
  DashboardOutlined, FileTextOutlined, MessageOutlined, TagsOutlined,
  PictureOutlined, SettingOutlined, CloudUploadOutlined, RobotOutlined,
  MenuOutlined, UserOutlined, LogoutOutlined, ExportOutlined,
} from '@ant-design/icons';
import { Alert, App, Button, Drawer, Dropdown, Layout, Menu, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useMobile } from '../lib/use-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthProvider';
import { logout, errorMessage } from '../lib/api-client';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const items = [
  { key: '/', icon: <DashboardOutlined />, label: '概览' },
  { key: '/posts', icon: <FileTextOutlined />, label: '文章管理' },
  { key: '/moments', icon: <MessageOutlined />, label: '碎碎念' },
  { key: '/taxonomy', icon: <TagsOutlined />, label: '分类与标签' },
  { key: '/media', icon: <PictureOutlined />, label: '素材库' },
  { key: '/publishing', icon: <CloudUploadOutlined />, label: '发布管理' },
  { key: '/ai', icon: <RobotOutlined />, label: 'AI 管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '站点设置' },
];

export function AdminLayout() {
  const mobile = useMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const auth = useAuth();
  const { message } = App.useApp();
  const selected = location.pathname.startsWith('/posts') ? '/posts' : location.pathname.startsWith('/moments') ? '/moments' : location.pathname;
  const navigation = <Menu theme={mobile ? 'light' : 'dark'} mode="inline" items={items} selectedKeys={[selected]}
    onClick={({ key }) => { setMenuOpen(false); navigate(key); }} />;
  const signOut = async () => {
    try {
      await logout();
      await client.cancelQueries();
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' });
      client.setQueryData(['session'], null);
      navigate('/login', { replace: true });
    }
    catch (error) { message.error(errorMessage(error)); }
  };
  return (
    <Layout className="admin-layout">
      {!mobile && <Layout.Sider width={220} className="admin-sidebar">
        <div className="brand">Blog Console</div>
        {navigation}
      </Layout.Sider>}
      <Drawer title="Blog Console" placement="left" size="min(320px, 88vw)" open={mobile && menuOpen} onClose={() => setMenuOpen(false)} className="mobile-nav-drawer">
        <nav aria-label="后台导航">{mobile && navigation}</nav>
      </Drawer>
      <Layout className="admin-main">
        <Layout.Header className="admin-header">
          <div className="admin-header-title">
            {mobile && <Button type="text" icon={<MenuOutlined />} aria-label="打开导航菜单" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} />}
            <Typography.Text strong>{mobile ? items.find((item) => item.key === selected)?.label ?? '博客管理' : '博客管理后台'}</Typography.Text>
            {!mobile && <Tag color="blue">{auth.session?.user.displayName}</Tag>}
          </div>
          {mobile ? <Dropdown trigger={['click']} menu={{ items: [
            { key: 'user', label: auth.session?.user.displayName, disabled: true },
            { key: 'blog', label: <a href="https://kvxin.top/" target="_blank" rel="noopener noreferrer">查看博客</a>, icon: <ExportOutlined /> },
            { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, onClick: () => void signOut() },
          ] }}><Button type="text" icon={<UserOutlined />} aria-label="账户菜单" /></Dropdown> :
          <Space><Typography.Link href="https://kvxin.top/" target="_blank" rel="noopener noreferrer">查看博客</Typography.Link><Button onClick={() => void signOut()}>退出登录</Button></Space>}
        </Layout.Header>
        <Layout.Content className="admin-content">
          <Alert className="admin-publish-notice" type="info" showIcon title={mobile ? '保存后到发布管理构建上线' : '内容保存后，请到发布管理构建上线'}
            description={mobile ? undefined : '发布管理会构建已发布且发布时间已到的内容；构建失败保留当前线上版本。'} />
          <div className="page-content"><Outlet /></div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

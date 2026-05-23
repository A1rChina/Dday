import { useForm, useTable } from '@refinedev/antd';
import { Button, Form, Input, Select, Space, Switch, Tag } from 'antd';
import { useState } from 'react';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';

import {
  AppPage,
  AppPageHeader,
  AppProTable,
  AppSearchForm,
} from './components';

export function UserResource() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editId, setEditId] = useState<string | null>(null);

  const { tableProps, searchFormProps } = useTable({
    resource: 'users',
    syncWithLocation: false,
  });

  const { formProps: createFormProps, saveButtonProps: createSaveProps } = useForm({
    resource: 'users',
    action: 'create',
    onMutationSuccess: () => setView('list'),
  });

  const { formProps: editFormProps, saveButtonProps: editSaveProps } = useForm({
    resource: 'users',
    action: 'edit',
    id: editId as string,
    onMutationSuccess: () => setView('list'),
  });

  if (view === 'create') {
    return (
      <AppPage>
        <AppPageHeader
          title="新增用户"
          extra={<Button icon={<ArrowLeftOutlined />} onClick={() => setView('list')}>返回</Button>}
        />
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, maxWidth: 600 }}>
          <Form {...createFormProps} layout="vertical">
            <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="显示名称" name="displayName" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="所属角色" name="role" rules={[{ required: true }]} initialValue="viewer">
              <Select>
                <Select.Option value="admin">管理员 (Admin)</Select.Option>
                <Select.Option value="planner">计划员 (Planner)</Select.Option>
                <Select.Option value="operator">操作员 (Operator)</Select.Option>
                <Select.Option value="viewer">查看者 (Viewer)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="登录密码" name="password" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item label="是否启用" name="isActive" valuePropName="checked" initialValue={1}>
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
            <Button {...createSaveProps} type="primary">保存</Button>
          </Form>
        </div>
      </AppPage>
    );
  }

  if (view === 'edit') {
    return (
      <AppPage>
        <AppPageHeader
          title="编辑用户"
          extra={<Button icon={<ArrowLeftOutlined />} onClick={() => setView('list')}>返回</Button>}
        />
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, maxWidth: 600 }}>
          <Form {...editFormProps} layout="vertical">
            <Form.Item label="用户名" name="username">
              <Input disabled />
            </Form.Item>
            <Form.Item label="显示名称" name="displayName" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="所属角色" name="role" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="admin">管理员 (Admin)</Select.Option>
                <Select.Option value="planner">计划员 (Planner)</Select.Option>
                <Select.Option value="operator">操作员 (Operator)</Select.Option>
                <Select.Option value="viewer">查看者 (Viewer)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="重置密码 (留空则保持不变)" name="password">
              <Input.Password />
            </Form.Item>
            <Form.Item label="是否启用" name="isActive" valuePropName="checked">
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
            <Button {...editSaveProps} type="primary">保存</Button>
          </Form>
        </div>
      </AppPage>
    );
  }

  const columns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '显示名称', dataIndex: 'displayName' },
    { title: '所属角色', dataIndex: 'role', render: (val: string) => <Tag color="blue">{val}</Tag> },
    { title: '启用状态', dataIndex: 'isActive', render: (val: number) => <Tag color={val ? 'green' : 'default'}>{val ? '是' : '否'}</Tag> },
    {
      title: '操作',
      render: (_: any, record: any) => (
        <a onClick={() => { setEditId(record.id); setView('edit'); }}>编辑</a>
      ),
    },
  ];

  return (
    <AppPage>
      <AppPageHeader
        title="用户管理"
        extra={
          <Space>
            <AppSearchForm searchFormProps={searchFormProps} placeholder="搜索用户名/显示名称" />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setView('create')}>新建用户</Button>
          </Space>
        }
      />
      <AppProTable {...tableProps} columns={columns} />
    </AppPage>
  );
}

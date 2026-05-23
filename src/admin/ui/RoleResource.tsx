import { useForm, useTable } from '@refinedev/antd';
import { Button, Form, Input, Space } from 'antd';
import { useState } from 'react';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';

import {
  AppPage,
  AppPageHeader,
  AppProTable,
} from './components';

export function RoleResource() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editId, setEditId] = useState<string | null>(null);

  const { tableProps } = useTable({
    resource: 'roles',
    syncWithLocation: false,
  });

  const { formProps: createFormProps, saveButtonProps: createSaveProps } = useForm({
    resource: 'roles',
    action: 'create',
    onMutationSuccess: () => setView('list'),
  });

  const { formProps: editFormProps, saveButtonProps: editSaveProps } = useForm({
    resource: 'roles',
    action: 'edit',
    id: editId as string,
    onMutationSuccess: () => setView('list'),
  });

  if (view === 'create') {
    return (
      <AppPage>
        <AppPageHeader
          title="新增角色"
          extra={<Button icon={<ArrowLeftOutlined />} onClick={() => setView('list')}>返回</Button>}
        />
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, maxWidth: 600 }}>
          <Form {...createFormProps} layout="vertical">
            <Form.Item label="角色代码" name="code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="角色名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="角色描述" name="description">
              <Input.TextArea />
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
          title="编辑角色"
          extra={<Button icon={<ArrowLeftOutlined />} onClick={() => setView('list')}>返回</Button>}
        />
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, maxWidth: 600 }}>
          <Form {...editFormProps} layout="vertical">
            <Form.Item label="角色代码" name="code">
              <Input disabled />
            </Form.Item>
            <Form.Item label="角色名称" name="name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="角色描述" name="description">
              <Input.TextArea />
            </Form.Item>
            <Button {...editSaveProps} type="primary">保存</Button>
          </Form>
        </div>
      </AppPage>
    );
  }

  const columns = [
    { title: '角色代码', dataIndex: 'code' },
    { title: '角色名称', dataIndex: 'name' },
    { title: '角色描述', dataIndex: 'description' },
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
        title="角色权限"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setView('create')}>新建角色</Button>}
      />
      <AppProTable {...tableProps} columns={columns} />
    </AppPage>
  );
}

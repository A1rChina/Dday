import { useForm, useTable } from '@refinedev/antd';
import { Button, Form, Input, Space } from 'antd';
import { useState } from 'react';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';

import {
  AppPage,
  AppPageHeader,
  AppProTable,
} from './components';

export function PermissionResource() {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editId, setEditId] = useState<string | null>(null);

  const { tableProps } = useTable({
    resource: 'permissions',
    syncWithLocation: false,
  });

  const { formProps: createFormProps, saveButtonProps: createSaveProps } = useForm({
    resource: 'permissions',
    action: 'create',
    onMutationSuccess: () => setView('list'),
  });

  const { formProps: editFormProps, saveButtonProps: editSaveProps } = useForm({
    resource: 'permissions',
    action: 'edit',
    id: editId as string,
    onMutationSuccess: () => setView('list'),
  });

  if (view === 'create') {
    return (
      <AppPage>
        <AppPageHeader
          title="新增权限点"
          extra={<Button icon={<ArrowLeftOutlined />} onClick={() => setView('list')}>返回</Button>}
        />
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, maxWidth: 600 }}>
          <Form {...createFormProps} layout="vertical">
            <Form.Item label="权限代码 (例如 system:read)" name="code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="所属模块" name="module" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="具体动作" name="action" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="功能描述" name="description">
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
          title="编辑权限点"
          extra={<Button icon={<ArrowLeftOutlined />} onClick={() => setView('list')}>返回</Button>}
        />
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, maxWidth: 600 }}>
          <Form {...editFormProps} layout="vertical">
            <Form.Item label="权限代码" name="code">
              <Input disabled />
            </Form.Item>
            <Form.Item label="所属模块" name="module" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="具体动作" name="action" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="功能描述" name="description">
              <Input.TextArea />
            </Form.Item>
            <Button {...editSaveProps} type="primary">保存</Button>
          </Form>
        </div>
      </AppPage>
    );
  }

  const columns = [
    { title: '权限代码', dataIndex: 'code' },
    { title: '所属模块', dataIndex: 'module' },
    { title: '具体动作', dataIndex: 'action' },
    { title: '功能描述', dataIndex: 'description' },
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
        title="权限点定义"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setView('create')}>新建权限</Button>}
      />
      <AppProTable {...tableProps} columns={columns} />
    </AppPage>
  );
}

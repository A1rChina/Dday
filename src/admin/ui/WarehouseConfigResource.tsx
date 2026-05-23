import { useTable } from '@refinedev/antd';
import { DatabaseOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Tag } from 'antd';
import { AppPage, AppPageHeader, AppProTable, AppDrawerForm } from './components';

export function WarehouseConfigResource() {
  const { tableProps: warehouseTable, searchFormProps: warehouseSearch } = useTable({
    resource: 'warehouses',
    pagination: { pageSize: 10 },
  });

  const { tableProps: locationTable, searchFormProps: locationSearch } = useTable({
    resource: 'locations',
    pagination: { pageSize: 10 },
  });

  return (
    <AppPage>
      <AppPageHeader title="仓库与库位设置" description="管理系统的物理仓库和下属库位" />
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>仓库列表</h3>
            <AppDrawerForm
              title="新建仓库"
              trigger={<Button type="primary" icon={<PlusOutlined />}>新建仓库</Button>}
              drawerProps={{ width: 480, className: 'mes-entity-drawer' }}
              useMutationProps={{
                mutationOptions: {
                  onSuccess: () => warehouseTable.onChange?.({ current: 1 } as any, {}, {}, {} as any)
                }
              }}
            >
              <div className="mes-drawer-content">
                <div className="mes-drawer-card">
                  <div className="mes-drawer-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <Form.Item label="仓库编码" name="code" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item label="仓库名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item label="类型" name="type" initialValue="normal"><Select options={[{ label: '普通仓', value: 'normal' }, { label: '线边仓', value: 'line_side' }]} /></Form.Item>
                    <Form.Item label="备注" name="remark"><Input.TextArea /></Form.Item>
                  </div>
                </div>
              </div>
            </AppDrawerForm>
          </div>
          <AppProTable
            {...warehouseTable}
            columns={[
              { title: '编码', dataIndex: 'code' },
              { title: '名称', dataIndex: 'name' },
              { title: '类型', dataIndex: 'type', render: (v) => <Tag>{v === 'normal' ? '普通仓' : '线边仓'}</Tag> },
            ]}
          />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>库位列表</h3>
            <AppDrawerForm
              title="新建库位"
              trigger={<Button type="primary" icon={<PlusOutlined />}>新建库位</Button>}
              drawerProps={{ width: 480, className: 'mes-entity-drawer' }}
              useMutationProps={{
                mutationOptions: {
                  onSuccess: () => locationTable.onChange?.({ current: 1 } as any, {}, {}, {} as any)
                }
              }}
            >
              <div className="mes-drawer-content">
                <div className="mes-drawer-card">
                  <div className="mes-drawer-form-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <Form.Item label="所属仓库编码" name="warehouseCode" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item label="库位编码" name="code" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item label="库位名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item label="备注" name="remark"><Input.TextArea /></Form.Item>
                  </div>
                </div>
              </div>
            </AppDrawerForm>
          </div>
          <Form {...locationSearch} layout="inline" style={{ marginBottom: 12 }}>
            <Form.Item name="warehouseCode"><Input.Search placeholder="按仓库编码过滤" allowClear onSearch={() => locationSearch.form?.submit()} /></Form.Item>
          </Form>
          <AppProTable
            {...locationTable}
            columns={[
              { title: '所属仓库', dataIndex: 'warehouseCode' },
              { title: '编码', dataIndex: 'code' },
              { title: '名称', dataIndex: 'name' },
            ]}
          />
        </div>
      </div>
    </AppPage>
  );
}

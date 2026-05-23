import { useTable } from '@refinedev/antd';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Typography } from 'antd';
import { AppPage, AppPageHeader, AppProTable, AppDrawerForm } from './components';

export function StocktakeResource() {
  const { tableProps } = useTable({
    resource: 'inventory-stocktakes',
    pagination: { pageSize: 10 },
  });

  return (
    <AppPage>
      <AppPageHeader title="库存盘点" description="新建和管理盘点单，录入实盘数量自动调整盈亏" />
      <div style={{ marginBottom: 16 }}>
        <AppDrawerForm
          title="新建盘点单"
          trigger={<Button type="primary" icon={<PlusOutlined />}>新建盘点单</Button>}
          drawerProps={{ width: 640, className: 'mes-entity-drawer' }}
          useMutationProps={{
            mutationOptions: {
              onSuccess: () => tableProps.onChange?.({ current: 1 } as any, {}, {}, {} as any)
            }
          }}
        >
          <div className="mes-drawer-content">
            <div className="mes-drawer-card">
              <div className="mes-drawer-card-title">基本信息</div>
              <div className="mes-drawer-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <Form.Item label="盘点仓库" name="warehouseId" rules={[{ required: true }]} initialValue="MAIN"><Input /></Form.Item>
                <Form.Item label="盘点日期" name="stocktakeDate" rules={[{ required: true }]}><Input type="date" /></Form.Item>
                <Form.Item label="经办人" name="actor" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item label="备注" name="notes" className="mes-drawer-form-item-full"><Input.TextArea /></Form.Item>
              </div>
            </div>

            <div className="mes-drawer-card">
              <div className="mes-drawer-card-title">盘点明细</div>
              <Form.List name="items" initialValue={[{}]}>
                {(fields, { add, remove }) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} style={{ border: '1px solid #f0f0f0', padding: 12, borderRadius: 8, background: '#fafafa' }}>
                        <div className="mes-drawer-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                          <Form.Item {...restField} name={[name, 'itemId']} label="物料ID" rules={[{ required: true }]}><Input /></Form.Item>
                          <Form.Item {...restField} name={[name, 'locationId']} label="库位ID"><Input /></Form.Item>
                          <Form.Item {...restField} name={[name, 'systemQty']} label="账面数量" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
                          <Form.Item {...restField} name={[name, 'actualQty']} label="实盘数量" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
                        </div>
                        {fields.length > 1 && (
                          <Button danger type="link" onClick={() => remove(name)} style={{ padding: 0 }}>删除明细</Button>
                        )}
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加盘点明细</Button>
                  </div>
                )}
              </Form.List>
            </div>
          </div>
        </AppDrawerForm>
      </div>

      <AppProTable
        {...tableProps}
        columns={[
          { title: '盘点单号', dataIndex: 'code', render: (v) => <Typography.Text copyable strong>{v}</Typography.Text> },
          { title: '仓库', dataIndex: 'warehouseId' },
          { title: '盘点日期', dataIndex: 'stocktakeDate' },
          { title: '状态', dataIndex: 'status' },
          { title: '经办人', dataIndex: 'createdBy' },
          { title: '创建时间', dataIndex: 'createdAt' },
        ]}
      />
    </AppPage>
  );
}

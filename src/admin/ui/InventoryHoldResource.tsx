import React from 'react';
import { useTable } from '@refinedev/antd';
import { AppProTable, AppPage, AppPageHeader } from './components';
import { Typography, Tag, Form, Input, Button } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';

const { Text } = Typography;

export function InventoryHoldResource() {
  const { tableProps, searchFormProps } = useTable({
    resource: 'inventory-holds',
    pagination: { pageSize: 10 },
    onSearch: (values: any) => {
      return [
        { field: 'q', operator: 'eq', value: values.q },
      ];
    },
  });

  const columns = [
    { title: '冻结单号', dataIndex: 'holdNo', width: 140 },
    { title: '物料/产品', width: 200, render: (_: any, record: any) => <Text>{record.itemCode} - {record.itemName}</Text> },
    { title: '仓库', dataIndex: 'warehouseId', width: 100 },
    { title: '数量', dataIndex: 'holdQuantity', width: 90, render: (val: number) => <Text strong>{val}</Text> },
    { title: '已处理', dataIndex: 'processedQuantity', width: 90 },
    { title: '状态', dataIndex: 'status', width: 90, render: (val: string) => <Tag color={val === 'active' ? 'orange' : 'green'}>{val === 'active' ? '冻结中' : '已关闭'}</Tag> },
    { title: '操作人', dataIndex: 'createdBy', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', width: 170 },
  ];

  return (
    <AppPage>
      <AppPageHeader title="库存冻结记录" icon={<DatabaseOutlined />} />
      <div className="mes-main-content">
        <Form {...searchFormProps} layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item name="q">
            <Input placeholder="搜索冻结单号/物料" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">搜索</Button>
          </Form.Item>
        </Form>
        <AppProTable {...tableProps} columns={columns} scroll={{ x: 1000 }} />
      </div>
    </AppPage>
  );
}

import type { ReactNode, CSSProperties } from 'react';
import { Button, Form, Input, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';

interface AppSearchFormProps {
  /** refinedev/antd useTable 的 searchFormProps */
  searchFormProps?: any;
  /** 搜索框 placeholder */
  placeholder?: string;
  /** 额外的表单项 */
  children?: ReactNode;
  /** 容器样式 */
  style?: CSSProperties;
}

/**
 * 搜索表单
 * 默认提供一个关键字搜索框 + 查询按钮
 * 可通过 children 添加更多筛选项
 */
export function AppSearchForm({ searchFormProps, placeholder, children, style }: AppSearchFormProps) {
  return (
    <Form {...searchFormProps} layout="inline" style={style}>
      {children || (
        <Form.Item name="q" style={{ marginBottom: 0 }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder={placeholder || '搜索...'}
            allowClear
            style={{ width: 220 }}
          />
        </Form.Item>
      )}
      <Form.Item style={{ marginBottom: 0 }}>
        <Space size={8}>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
            查询
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => searchFormProps?.form?.resetFields()}
          >
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}

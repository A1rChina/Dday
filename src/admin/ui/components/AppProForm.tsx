import type { ReactNode, CSSProperties } from 'react';
import { Form } from 'antd';
import type { FormProps } from 'antd';

interface AppProFormProps extends FormProps {
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * AppProForm — 统一表单容器
 *
 * 预设 layout: vertical / labelCol / 间距 / 校验样式
 */
export function AppProForm({ children, layout = 'vertical', ...rest }: AppProFormProps) {
  return (
    <Form layout={layout} {...rest}>
      {children}
    </Form>
  );
}

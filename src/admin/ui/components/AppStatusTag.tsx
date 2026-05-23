import { Tag } from 'antd';

interface StatusMeta {
  text: string;
  color: string;
}

interface AppStatusTagProps {
  status: string;
  statusMap: Record<string, StatusMeta>;
  fallbackText?: string;
}

/**
 * 统一状态标签
 * 根据 statusMap 映射 status -> 文本/颜色
 */
export function AppStatusTag({ status, statusMap, fallbackText }: AppStatusTagProps) {
  const meta = statusMap[status] || { text: fallbackText || status, color: 'default' };
  return <Tag color={meta.color}>{meta.text}</Tag>;
}

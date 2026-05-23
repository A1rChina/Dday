import type { ReactNode } from 'react';
import { Button, Tooltip } from 'antd';
import type { ButtonProps } from 'antd';

interface AppActionButtonProps {
  icon?: ReactNode;
  label: string;
  disabledReason?: string;
  onClick: () => void;
  type?: ButtonProps['type'];
  ghost?: boolean;
  danger?: boolean;
  loading?: boolean;
  triggerWhenDisabled?: boolean;
}

/**
 * 操作按钮 · 自动处理 disabled 状态和 Tooltip
 * 当 disabledReason 非空时，按钮禁用并 Tooltip 显示原因
 */
export function AppActionButton({
  icon,
  label,
  disabledReason,
  onClick,
  type = 'default',
  ghost,
  danger,
  loading,
  triggerWhenDisabled = false,
}: AppActionButtonProps) {
  const isDisabled = Boolean(disabledReason);
  const disabled = isDisabled && !triggerWhenDisabled;

  const button = (
    <Button
      icon={icon}
      type={type}
      ghost={ghost}
      danger={danger}
      loading={loading}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );

  if (isDisabled && disabledReason) {
    return <Tooltip title={disabledReason}>{button}</Tooltip>;
  }

  return button;
}

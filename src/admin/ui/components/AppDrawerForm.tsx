import { DrawerForm } from '@ant-design/pro-components';
import type { DrawerFormProps } from '@ant-design/pro-components';

/**
 * AppDrawerForm — 统一 Drawer 表单
 *
 * 封装 ProComponents DrawerForm，统一宽度、样式、提交按钮位置。
 */
export function AppDrawerForm(props: DrawerFormProps & { children?: React.ReactNode }) {
  const {
    width = 720,
    drawerProps,
    submitter,
    ...rest
  } = props;

  return (
    <DrawerForm
      width={width}
      drawerProps={{
        destroyOnClose: true,
        styles: {
          body: { paddingBottom: 60 },
        },
        ...drawerProps,
      }}
      submitter={
        submitter ?? {
          searchConfig: { submitText: '确认提交', resetText: '取消' },
          submitButtonProps: { style: { minWidth: 100 } },
        }
      }
      {...rest}
    />
  );
}

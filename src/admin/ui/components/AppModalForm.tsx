import { ModalForm } from '@ant-design/pro-components';
import type { ModalFormProps } from '@ant-design/pro-components';

/**
 * AppModalForm — 统一 Modal 表单
 *
 * 封装 ProComponents ModalForm，统一宽度、样式、提交按钮。
 */
export function AppModalForm(props: ModalFormProps & { children?: React.ReactNode }) {
  const {
    width = 680,
    modalProps,
    submitter,
    ...rest
  } = props;

  return (
    <ModalForm
      width={width}
      modalProps={{
        destroyOnClose: true,
        ...modalProps,
      }}
      submitter={
        submitter ?? {
          searchConfig: { submitText: '确认', resetText: '取消' },
        }
      }
      {...rest}
    />
  );
}

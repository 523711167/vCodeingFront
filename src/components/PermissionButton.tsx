import type { ButtonProps } from 'antd';
import { Button } from 'antd';
import { useAppSelector } from '@/store/hooks';

interface PermissionButtonProps extends ButtonProps {
  permissionCode: string;
}

function PermissionButton({
  permissionCode,
  children,
  ...buttonProps
}: PermissionButtonProps) {
  const buttonCodes = useAppSelector((state) => state.permission.buttonCodes);

  if (!buttonCodes.includes(permissionCode)) {
    // 权限不足时直接不渲染，页面层不需要反复手写 if 判断。
    return null;
  }

  return <Button {...buttonProps}>{children}</Button>;
}

export default PermissionButton;

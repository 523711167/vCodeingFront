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
    return null;
  }

  return <Button {...buttonProps}>{children}</Button>;
}

export default PermissionButton;

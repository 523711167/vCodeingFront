import type { ButtonProps } from 'antd';
import { Button } from 'antd';

interface PermissionButtonProps extends ButtonProps {
  permissionCode: string;
}

function PermissionButton({
  permissionCode,
  children,
  ...buttonProps
}: PermissionButtonProps) {
  // 当前项目处于联调阶段，按钮级权限先全部放开。
  // 这里保留 permissionCode 参数，是为了让页面调用方式不变；
  // 后续恢复权限控制时，只需要在这一层重新接回判断逻辑。
  void permissionCode;

  return <Button {...buttonProps}>{children}</Button>;
}

export default PermissionButton;

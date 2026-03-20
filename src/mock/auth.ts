import type { LoginRequest } from '@/services/auth.service';

function wait(ms = 400) {
  // 人为加一点延迟，是为了让登录 loading 和异步流程在本地也能真实暴露出来。
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function mockLogin(payload: LoginRequest) {
  await wait();

  // 这里故意只开放一组固定账号，方便示例项目快速验证完整登录链路。
  if (payload.username === 'admin' && payload.password === '123456') {
    return {
      token: 'mock-admin-token',
    };
  }

  // 登录失败也要保持和真实接口相似的错误行为，方便页面处理异常提示。
  throw new Error('账号或密码错误，请使用 admin / 123456 登录');
}

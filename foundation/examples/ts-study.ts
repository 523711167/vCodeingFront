import {Action} from "@reduxjs/toolkit";


// 索引签名 [extraProps: string] 表示UnknownAction允许任何字符串key val为unknown
interface UnknownAction extends Action<string> {
    [extraProps: string]: unknown;
}


//
interface UseDispatch<T extends Dispatch<UnknownAction> = Dispatch<UnknownAction>> {

    // 此处为调用签名 表示UseDispatch同函数一样执行，返回AppDispatch约束于Dispatch
    <AppDispatch extends T = T>(): AppDispatch;

    withTypes: <OverrideDispatchType extends T>() => UseDispatch<OverrideDispatchType>;
}

interface Dispatch<A extends Action = UnknownAction> {
    <T extends A>(action: T, ...extraArgs: any[]): T;
}





type MyAction =
    | { type: 'add'; payload: number }
    | { type: 'remove'; id: string };

// MyAction 只能是两种结构之一：
// 1. type 为 'add'，并且必须带 payload
// 2. type 为 'remove'，并且必须带 id
const myAction: MyAction = {
    type: 'add',
    payload: 77
}

const myAction2: MyAction = {
    type: 'remove',
    id: '77'
}

// MyAction为范型参数
interface dispatch1<MyAction> {
    (action: MyAction): MyAction
}

interface dispatch<T extends MyAction> {
    (action: T): T
}
const fn: dispatch<MyAction> = (action) => action;
// 类型推断 add或remove
fn(myAction).type

interface narrowDispatch<T extends MyAction> {
    <A extends T>(action: A): A;
}
const narrowfn: narrowDispatch<MyAction> = (action) => action;
// 类型推断  add
narrowfn(myAction).type

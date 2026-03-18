# TypeScript 基础知识

这份笔记面向“刚开始学 TypeScript，但已经接触过 JavaScript”的读者。

核心目标只有一个：先把 TypeScript 看成“给 JavaScript 增加类型约束和类型推导的工具”，不要一开始就被复杂语法吓住。

## 1. TypeScript 到底解决什么问题

JavaScript 很灵活，但灵活的代价是：

- 变量里到底放什么，很多时候只能靠人记。
- 函数参数传错了，通常要到运行时才知道。
- 返回值结构变了，调用方可能不会立刻报错。
- 大型项目重构时，编辑器很难给出足够可靠的提示。

TypeScript 的作用就是在“代码运行前”多做一层检查：

- 变量应该是什么类型。
- 函数接收什么参数。
- 函数返回什么结果。
- 对象里应该有哪些字段。

所以你可以把它理解为：

`TypeScript = JavaScript + 类型系统 + 更强的编辑器能力`

## 2. 先分清两个世界：值 和 类型

这是最关键的一步。

在 TypeScript 里，经常同时存在两个世界：

- 值的世界：运行时真实存在，比如 `const user = { name: 'Tom' }`
- 类型的世界：只在编译阶段存在，比如 `type User = { name: string }`

示例：

```ts
const count = 1;
type CountType = number;
```

这里：

- `count` 是值
- `CountType` 是类型

而 `typeof` 的作用，就是把“值”对应的“类型”拿出来：

```ts
const count = 1;
type CountType = typeof count; // number
```

这也是你前面提到的 `typeof store.dispatch` 的本质。

## 3. 基础类型

最常见的基础类型有这些：

```ts
const userName: string = 'Tom';
const age: number = 18;
const isAdmin: boolean = true;
const tags: string[] = ['ts', 'react'];
const tuple: [string, number] = ['id', 1];
```

几个注意点：

- `string`、`number`、`boolean` 是最基础的原始类型。
- `string[]` 表示“字符串数组”。
- `[string, number]` 是元组，强调“位置固定、类型固定”。

## 4. 对象类型：type 和 interface

对象类型通常有两种写法：

```ts
type User = {
  id: number;
  name: string;
};

interface Product {
  id: number;
  title: string;
}
```

入门阶段可以先这样理解：

- `type` 更灵活，适合联合类型、工具类型、类型别名。
- `interface` 更像“对象结构契约”，适合描述对象和类的形状。

在真实项目里，两者都很常见。不要把重点放在“谁绝对更好”，而要先会看、会写、会维护。

## 5. 函数类型

TypeScript 会关心两个问题：

- 参数是什么类型。
- 返回值是什么类型。

```ts
function add(a: number, b: number): number {
  return a + b;
}
```

这里的意思是：

- `a` 和 `b` 都必须是 `number`
- 函数最终返回 `number`

如果返回值很明显，TypeScript 也能自动推导：

```ts
function greet(name: string) {
  return `Hello, ${name}`;
}
```

这里虽然没写返回值类型，但编辑器仍然能推导出它返回 `string`。

## 6. 联合类型 和 类型收窄

联合类型表示“可能是几种类型中的一种”：

```ts
let value: string | number;
```

这时你不能直接把它当成 `string` 用，因为它也可能是 `number`。

所以要先做判断，这个过程叫“类型收窄”：

```ts
function printValue(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }

  return value.toFixed(2);
}
```

为什么要这么做：

- 因为 TypeScript 需要你先证明当前分支里到底是什么类型。
- 一旦证明了，编辑器和编译器就能给出更准确的能力提示。

## 7. 泛型：让类型跟着输入走

泛型的核心作用不是“高级”，而是“复用同一套逻辑，同时保留具体类型信息”。

```ts
function getFirstItem<T>(list: T[]): T | undefined {
  return list[0];
}
```

这里的 `T` 可以理解为“暂时不知道的类型占位符”。

调用时：

```ts
const firstName = getFirstItem(['Tom', 'Jerry']); // string | undefined
const firstNumber = getFirstItem([1, 2, 3]); // number | undefined
```

同一套函数逻辑，可以适配不同输入，并且返回值类型不会丢。

## 8. 类型推导为什么重要

TypeScript 不是要求你什么都手写，它更推荐“能推导就推导，必要时再显式补充”。

例如：

```ts
const title = 'vCodeing';
```

这里通常不用再写成：

```ts
const title: string = 'vCodeing';
```

因为 TypeScript 本来就能推导出来。

实际开发里更重要的是：

- 在边界处写清类型，比如函数参数、接口返回值、状态结构。
- 在中间过程尽量让编译器自动推导，减少重复。

## 9. `typeof` 在开发中的作用

`typeof` 在类型系统里的作用是：

从现有值中提取类型，避免手写重复类型。

示例：

```ts
const settings = {
  theme: 'light',
  language: 'zh-CN',
};

type Settings = typeof settings;
```

这里的 `Settings` 会自动变成：

```ts
type Settings = {
  theme: string;
  language: string;
};
```

它的价值在于：

- 代码已经有真实结构，不需要再手抄一份类型。
- 当 `settings` 的结构变化时，类型也会一起更新。

在 Redux 里，常见写法就是：

```ts
type AppDispatch = typeof store.dispatch;
```

意思是直接复用真实 `dispatch` 的函数类型。

## 10. `ReturnType` 在开发中的作用

`ReturnType<T>` 的职责是：

从函数类型里，提取返回值类型。

示例：

```ts
function createUser() {
  return {
    id: 1,
    name: 'Tom',
  };
}

type User = ReturnType<typeof createUser>;
```

这里的 `User` 会自动变成：

```ts
type User = {
  id: number;
  name: string;
};
```

它解决的问题是：

- 你不用再额外维护一份“和返回值长得一样”的类型。
- 当函数返回结构调整后，依赖类型会自动跟着变。

## 11. `infer` 先不用死记，先知道它在做“提取”

你看到过这句：

```ts
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any;
```

入门阶段不用纠结它的完整语法树，可以先记住：

- `infer R` 的意思是“从某个类型结构里，推断出一个子类型，并起名为 `R`”。
- `ReturnType` 正是借助这个能力，把函数的返回值类型拆出来。

所以你可以把 `infer` 理解成“类型层面的解构提取”。

## 12. 实际开发里最常见的 TypeScript 价值

### 12.1 给接口响应建模

```ts
type UserDTO = {
  id: number;
  name: string;
  role: 'admin' | 'editor' | 'visitor';
};
```

这样页面拿到响应后，编辑器会立刻提示你哪些字段可用。

### 12.2 给组件 props 建模

```ts
type UserCardProps = {
  userName: string;
  onSelect: (id: number) => void;
};
```

组件调用方如果传错参数，能在写代码时就发现。

### 12.3 给全局状态建模

```ts
type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;
```

这样 `useSelector`、`useDispatch`、thunk 都能共享统一类型来源。

### 12.4 重构更安全

重命名字段、调整函数返回结构、拆模块时，TypeScript 会帮助你发现受影响位置。

## 13. 初学者最容易踩的坑

### 13.1 什么都手写类型

问题：

- 重复多。
- 容易和真实代码脱节。

建议：

- 能推导就推导。
- 在函数入参、返回值、公共数据结构这些边界上补类型。

### 13.2 滥用 `any`

`any` 的意思是“放弃类型检查”。

它不是绝对不能用，但一旦滥用，TypeScript 的价值会迅速下降。

更稳妥的做法通常是：

- 先用 `unknown`
- 再通过判断收窄

### 13.3 把 `type`、`interface` 的差异看得过重

初学阶段更重要的是：

- 先把对象类型、函数类型、联合类型看懂。
- 先学会用 `typeof`、`ReturnType` 减少重复。

## 14. 一条适合入门的学习主线

建议你按下面顺序继续学：

1. 基础类型
2. 对象类型：`type` / `interface`
3. 函数参数和返回值
4. 联合类型和类型收窄
5. 泛型
6. `typeof`
7. `keyof`
8. `ReturnType`、`Parameters`
9. 条件类型和 `infer`

这个顺序的好处是：从“能看懂业务代码”出发，而不是从语法大全出发。

## 15. 放回这个项目里，你优先看什么

如果你想把这些知识和当前仓库串起来，建议优先看：

- `src/store/index.ts`
  - 看 `RootState` 和 `AppDispatch` 是怎么从 store 推导出来的。
- `src/store/hooks.ts`
  - 看为什么要把 `useDispatch` 和 `useSelector` 做一层类型封装。
- `src/router/types.ts`
  - 看对象结构类型在路由配置里怎么落地。
- `src/services/http.ts`
  - 看接口请求和响应类型应该怎么建模。

## 16. 你现在可以先记住的三句话

1. TypeScript 不是替代 JavaScript，而是给 JavaScript 补“类型约束”和“推导能力”。
2. `typeof` 是从值里拿类型，`ReturnType` 是从函数类型里拿返回值类型。
3. 实际开发里最重要的不是把语法全背下来，而是减少重复、降低改动风险、让编辑器提示更可靠。

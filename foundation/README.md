# TypeScript Foundation

这个目录用于沉淀 TypeScript 和工程基础知识，目标不是一次写完，而是让后续学习记录有稳定入口。

## 当前内容

- [`typescript-basics.md`](./typescript-basics.md)
  - 面向刚接触 TypeScript 的学习笔记。
  - 重点解释“类型是什么、为什么要写类型、真实项目里怎么用”。
- [`examples/ts-basics-demo.ts`](./examples/ts-basics-demo.ts)
  - 配套示例代码。
  - 每一段都补了注释，方便把概念和代码对起来看。

## 建议学习顺序

1. 先读 `typescript-basics.md`，建立“值 / 类型 / 推导”这条主线。
2. 再看 `examples/ts-basics-demo.ts`，把抽象概念放回代码里理解。
3. 最后回到业务代码，优先观察 `src/store`、`src/router`、`src/services` 这些对类型依赖更重的目录。

## 后续扩展入口

- 如果你想继续补“React + TS”的内容，可以在这个目录新增：
  - `react-with-typescript.md`
  - `redux-toolkit-types.md`
  - `api-response-modeling.md`
- 如果你想做练习题，建议继续在 `examples/` 下新增独立主题文件，避免把一个示例文件堆得过大。

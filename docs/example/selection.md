# 案例：选择

编辑器的状态总会保存至少一个选择区间。当[多选择](https://codemirror.net/docs/ref/#state.EditorState%5EallowMultipleSelections)开启时，也许会有多个选择区间。

区间包含一个锚（按住 shift 时不会移动的一边）和一个头（会移动的一边）。当锚和头相同时，叫做游标选择，其他则叫是一个选择区间。

当有多个选择区间时，其中一个被认为是主区间（也是原生选择反映的那一个）。如果你有一个编辑器状态，可以通过 `state.selection.main` 访问主区间。[SelectionRange](https://codemirror.net/docs/ref/#state.SelectionRange) 对象用于保持文档位置，包含 anchor 和 head 属性（如果您对最小或最大侧感兴趣，还添加 `from/to`）。

和其他编辑器状态修改的方式一样，通过调用事务移动选择。例如下方：移动游标到文档起始位置：

``` javascript
view.dispatch({ selection: { anchor: 0 } })
```

事务规范的[选择](https://codemirror.net/docs/ref/#state.TransactionSpec.selection)属性接受简写对象 `{ anchor: number, head?: number }`和完整 [EditorSelection](https://codemirror.net/docs/ref/#state.EditorSelection) 的实例其中一个。

下面代码创建两个选择范围，选中了编辑器中第 4 个和第 6 个字符，以及位置为 8 的游标选择。使用的方式是第二种。

``` javascript 
view.dispatch({
  selection: EditorSelection.create([
    EditorSelection.range(4, 5),
    EditorSelection.range(6, 7),
    EditorSelection.cursor(8)
  ], 1)
})
```

如果在事务改变文档的同时设置选择，选择应该指向修改后的文档。例如，下面展示再插入一个星号在位置 10 后设置游标在星号的后面。

``` javascript
view.dispatch({
  changes: {from: 10, insert: "*"},
  selection: {anchor: 11}
})
```

如果想要写一个指令来控制选择，您得稍微注意下多选择的情况。[`replaceSeletion`](https://codemirror.net/docs/ref/#state.EditorState.replaceSelection)（替换所有选择区间为相同文本） 和 [`changeByRange`](https://codemirror.net/docs/ref/#state.EditorState.changeByRange)（允许您指定每个范围的更改，并将它们合并到单个事务规范中） 这种辅助方法会很有帮助的。

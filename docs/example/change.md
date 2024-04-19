# 案例：文档修改

程序初始化编辑器状态修改通过调用事务来完成。

``` javascript
// 在文档起始位置插入文本
view.dispatch({
  changes: {from: 0, insert: "#!/usr/bin/env node\n"}
})
```

修改（替换）通过 `{ from, to, insert }` 对象描述。插入文本 `to` 可以省略，删除文本，`insert`可以省略。

调用一个事务的时候，您可以传入一个修改数组。每个修改项 `from/to` 指向的位置是基于原始文档，而不是基于数组中前一个修改后的文档。

例如：替换文档中所有 tab 为两个空格，您可以这么做：

``` javascript
let text = view.state.doc.toString();
let pos = 0;
let changes = [];
for (let next; (next = text.indexOf("\t", pos)) > -1;) {
  changes.push({from: next, to: next + 1, insert: "  "})
  pos = next + 1
}
view.dispatch({changes})
```

基于选择内容做修改，通常会使用 `replaceSelection` 方法来创建事务规范。这会将每个选择范围替换为给定的字符串，并将选择范围移动到该字符串的末尾（默认情况下，它们会留在字符串的前面）：

``` javascript
view.dispatch(view.state.replaceSelection("★"))
```


280/10000
AI翻译
280/1000AI translation requires more complex operations on each selection range, without the need for manual handling of potential complex interactions between these ranges and the changes created for them. You can use the changeByRange auxiliary function. This will package all ranges in an underline, for example:

要对每个选择范围进行更复杂的操作，而无需手动处理这些范围之间潜在的复杂交互以及为它们创建的更改，您可以使用 `changeByRange` 辅助函数。这将把所有范围都包装在下划线中，例如：

``` javascript
view.dispatch(view.state.changeByRange(range => ({
  changes: [
    { from: range.from, insert: "_" },
    { from: range.to, insert: "_" }
  ],
  range: EditorSelection.range(range.from, range.to + 2)
})))
```

该方法接受一个回调，每次当前选择范围都会调用该回调。它应该返回一个对象，枚举该范围的变化，以及该范围的新位置（考虑对该范围所做的更改，但不考虑对其他范围所做的更改）。

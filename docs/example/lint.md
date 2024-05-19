# 案例：Linter

[@codemirror/lint](/documentation/ref#lint)包提供了一种在编辑器中显示错误和警告的方法。如果给它一个源函数，当编辑器产生一系列问题的时候，那么当对文档进行更改，它将调用此函数，并显示其结果。

库没有包含lint来源。一些语言包（如@codemirror/lang javascript）可能包括与lint库的集成，但通常必须自己设置。

有两种使用方式：

+ 找到一个可以在浏览器中运行的 linter，在内容上运行它，并将其输出转换为期望的格式。
+ 从头开始写一个，可能使用编辑器保存的语法树。

在本例中，我们将使用第二种方式。

假设老板已经决定正则表达式是魔鬼的工作（公平地说，这不完全是错的），并且应该在整个代码库中被禁止。我们想要一个高亮 JavaScript 代码中正则表达式的任何使用的linter。

好在JavaScript解析器为正则表达式文本发出特定的节点类型，我们只要迭代解析树上的节点并为我们找到的每个节点发出警告。

``` javascript
import { syntaxTree } from "@codemirror/language"
import { linter, Diagnostic } from "@codemirror/lint"

const regexpLinter = linter(view => {
  let diagnostics: Diagnostic[] = []
  syntaxTree(view.state)
    .cursor()
    .iterate(node => {
      if (node.name == "RegExp") {
          diagnostics.push({
          from: node.from,
          to: node.to,
          severity: "warning",
          message: "Regular expressions are FORBIDDEN",
          actions: [
            {
              name: "Remove",
              apply(view, from, to) { view.dispatch({changes: { from, to }}) }
            }
          ]
        })
      }
    })
  return diagnostics
})
```

Diagnostics（lint源返回的对象）必须具有指示其应用范围的`from`和`to`属性、`severity`和`message`字段。

这个还使用可选字段 `actions` 为诊断结果添加一个“操作”。这为诊断添加了一个按钮，可以点击该按钮来执行一些效果，比如自动修复问题（这是一种非常粗糙的方式）或提供进一步的上下文。

调用linter的结果是一个扩展，您可以将其包含在（JavaScript）编辑器中以获得下方效果：


如果您使用了 `lintGutter`，还会显示提示槽。您还可以按Ctrl-Shift-m（在macOS上为Cmd-Shift-m）在编辑器下方的面板中显示诊断列表。

# 案例：自动补全

[@codemirror/autocomplete](https://codemirror.net/docs/ref/#autocomplete) 包提供在编辑器中显示输入建议的功能。本案例将会展示怎么开启它以及怎么编写出属于您的补全资源。

## 设置

自动补全通过在配置中添加 [autocompletion](https://codemirror.net/docs/ref/#autocomplete.autocompletion) 拓展开启（已经被基本设置中包含）。一些语言包会内置一些自动补全，比如说 [HTML 包](https://github.com/codemirror/lang-html/)。

默认情况下，插件会在用户输入时查找补全，当然您也可以[配置](https://codemirror.net/docs/ref/#autocomplete.autocompletion%5Econfig.activateOnTyping)补全只在某种[命令](https://codemirror.net/docs/ref/#autocomplete.startCompletion)下激活。

默认的[补全按键绑定](https://codemirror.net/docs/ref/#autocomplete.completionKeymap) `Ctrl-Space` 来开启，通过 `Arrow` 来选择补全，`Enter` 选中，`Escape` 关闭补全提示框。这些都会在添加补全拓展时默认激活，当然您也可以[禁用](https://codemirror.net/docs/ref/#autocomplete.autocompletion%5Econfig.defaultKeymap)这些默认按键绑定，来自定义按键。

默认情况下，我们不会处理将 Tab 按键绑定到 [acceptComplement](https://codemirror.net/docs/ref/#autocomplete.acceptCompletion)，这一点在之前的章节 [Tab处理](/example/tab) 有详细解释。

## 提供补全

补全拓展通常会显示一个或多个[补全源](https://codemirror.net/docs/ref/#autocomplete.CompletionSource)，通过一个函数返回描述要补全的范围和需要显示的[选项](https://codemirror.net/docs/ref/#autocomplete.Completion)，该函数接受[补全上下文对象](https://codemirror.net/docs/ref/#autocomplete.CompletionContext)（一个包含请求补全信息的[对象](https://codemirror.net/docs/ref/#autocomplete.CompletionResult)）。补全源可能是异步的，通过 Promise 返回。

将一个补全资源链接到编辑器最简单的方式是[覆盖选项](https://codemirror.net/docs/ref/#autocomplete.autocompletion%5Econfig.override)。

本案例使用下方的补全函数。

``` typescript
import { CompletionContext } from "@codemirror/autocomplete"

function myCompletions(context: CompletionContext) {
  let word = context.matchBefore(/\w*/)
  if (word.from == word.to && !context.explicit)
    return null
  return {
    from: word.from,
    options: [
      { label: "match", type: "keyword" },
      { label: "hello", type: "variable", info: "(World)" },
      { label: "magic", type: "text", apply: "⠁⭒*.✩.*⭒⠁", detail: "macro" }
    ]
  }
}
```

这是一种非常原始的补全方式，没有真正的查询编辑器上下文。但它展现了一个补全函数应该要做到的一些基本事情：

+ 明确光标前的哪一段文字可以补全。这里我们使用 [matchBefore](https://codemirror.net/docs/ref/#autocomplete.CompletionContext.matchBefore) 方法通过一个正则表达式来确定。

+ 检查补全是否恰当。 [explicit](https://codemirror.net/docs/ref/#autocomplete.CompletionContext.explicit) 标志位表明补全是通过[命令](https://codemirror.net/docs/ref/#autocomplete.startCompletion)显式启动的，还是通过输入隐式启动的。通常，只应在显式完成或完成位置在可以完成的某个构造之后时返回结果。

+ 构建一个补全列表和起始位置并返回（结束的位置默认为补全位置）。

[补全项](https://codemirror.net/docs/ref/#autocomplete.Completion)是一个对象，包含 label 属性，它还提供选项列表中显示的文本和补全时插入的文本。

默认情况下，补全列表显示 label。您可以提供一个 [type](https://codemirror.net/docs/ref/#autocomplete.Completion.type) 属性，来决定补全时显示什么样的图表。[detail](https://codemirror.net/docs/ref/#autocomplete.Completion.detail) 属性可以给简短的 `label` 做点补充说明，[info](https://codemirror.net/docs/ref/#autocomplete.Completion.info) 可以用于较长的文本，当选择完成时，显示在列表一侧的窗口中。

想要重写选中补全的内容，可以使用 [`apply`](https://codemirror.net/docs/ref/#autocomplete.Completion.apply) 属性，该属性可以是替换补全范围的字符串，也可以是将被调用以应用任意操作的函数。

如果您想要将补全源作为一个通用拓展，或者在混合语言文档中使用，配置成全局源是不可行的。当没有给出覆盖时，插件将使用 [`EditorState.languageDataAt`](https://codemirror.net/docs/ref/#state.EditorState.languageDataAt)（传入 `name` 参数为 “autocomplete”）来查找合适的[语言](https://codemirror.net/docs/ref/#language.Language)补全功能。注册这些功能通过语言对象的[数据](https://codemirror.net/docs/ref/#language.Language.data) facet 完成。比如：在状态配置中包含以下内容

``` javascript
myLanguage.data.of({
  autocomplete: myCompletions
})
```

您同样可以直接给该属性传入一个[补全对象](https://codemirror.net/docs/ref/#autocomplete.Completion)数组，这样库可以比较方便将它们作为一个源（包裹在 [`completeFromList`](https://codemirror.net/docs/ref/#autocomplete.completeFromList) ）。

## 排序和筛选

上面这种简单的补全源不需要根据输入来筛选不去那 —— 但是插件需要考虑这一点。插件可以根据当前输入文本使用模糊匹配来筛选和排序补全内容，并高亮显示每个匹配上的补全项。

为了能流畅的排序补全，需要您给补全对象传入 [`boost`](https://codemirror.net/docs/ref/#autocomplete.Completion.boost) 属性，可以增加或者降低匹配项的权重。

如果您想完全自定义筛选和排序补全，您可以在结果对象中传入 [`filter: false`](https://codemirror.net/docs/ref/#autocomplete.CompletionResult.filter) 属性来禁用内容筛选。

## 补全结果校验

有些补全源需要在每次按键时重新计算结果，但对其中许多源来说，这是不必要且效率低下的。它们返回给定构造的完整补全列表，只要用户在该构造内键入（或后退），就可以使用相同的列表（针对当前键入的输入进行过滤）来填充补全列表。

这也是为什么强烈建议在补全结果提供一个 [`validFor`](https://codemirror.net/docs/ref/#autocomplete.CompletionResult.validFor) 属性。它应该包含一个函数或正则表达式，告诉扩展，只要是更新的输入（结果的 `from` 属性和完成点之间的范围）与该值匹配，它就可以继续使用完成列表。

上述 `myCompletions` 函数，这种所有补全内容否是比较简单的单词，`validFor` 设置为 /^\w+$/ 就已经比较合适了。

## 根据语法补全

想要补全源更智能一些，检查补全点周边[语法树](https://codemirror.net/docs/ref/#language.syntaxTree)会很有帮助，并可以使用它更好的了解正在补全的构造类型。

举个例子，下面 JavaScript 的补全源将补全块注释中的（一些）[JSDoc](https://jsdoc.app/)标记。

``` typescript
import { syntaxTree } from "@codemirror/language"

const tagOptions = [
  "constructor", "deprecated", "link", "param", "returns", "type"
].map(tag => ({ label: "@" + tag, type: "keyword" }))

function completeJSDoc(context: CompletionContext) {
  let nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1)
  
  if (
    nodeBefore.name != "BlockComment" ||
    context.state.sliceDoc(nodeBefore.from, nodeBefore.from + 3) != "/**"
  ) {
    return null
  }

  let textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
  let tagBefore = /@\w*$/.exec(textBefore)

  if (!tagBefore && !context.explicit) return null

  return {
    from: tagBefore ? nodeBefore.from + tagBefore.index : context.pos,
    options: tagOptions,
    validFor: /^(@\w*)?$/
  }
}
```

该函数从直接在补全位置前面[找到](https://lezer.codemirror.net/docs/ref/#common.Tree.resolveInner)语法节点开始。如果这不是块注释，或者是没有`/**` 开始标记的块注释，则返回 `null` 表示没有补全内容。

如果补全确实发生在块注释中，我们会检查它前面是否有一个现有的标签。如果有，则该标记包含在补全中（请参阅返回对象中的from属性）。如果没有，则只能显示启动补全。

您可以使用如下拓展开启 JavaScript 内容的补全。

``` javascript
import { javascriptLanguage } from "@codemirror/lang-javascript"

const jsDocCompletions = javascriptLanguage.data.of({
  autocomplete: completeJSDoc
})
```

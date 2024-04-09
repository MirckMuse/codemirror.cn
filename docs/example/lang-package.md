# 案例：编写语言包

CodeMirror 通过特定包支持语言（命名像是：`@codemirror/lang-python` 或 `codemirror-lang-elixir`），这类包实现了使用语言需要的一些特性。可以是：

+ 语言解析器。
+ 附加的语法（syntax）关联元数据，比如：高亮、缩进和折叠信息。
+ 各种语言特定拓展【可选】，比如：支持自动补全和语言特定的按键绑定。

本例中，我们会实现一个类似 Lisp 语言非常迷你的语言包。Git 仓库[codemirror/lang-example](codemirror/lang-example)是个语言示例，带有构建工具配置等设置。这对于一开始构建属于自己的包非常有帮助。

## 解析

我们首先需要一个解析器，用作[高亮](https://codemirror.net/docs/ref/#language.HighlightStyle)上，同样也提供[语法（syntax）感知选择](https://codemirror.net/docs/ref/#commands.selectParentSyntax)，[自动补全](https://codemirror.net/docs/ref/#commands.insertNewlineAndIndent)和[代码折叠](https://codemirror.net/docs/ref/#h_folding)的结构信息。CodeMirror 有多种方式可以实现一个解析器。

+ 使用 [Lezer](https://lezer.codemirror.net/) 语法（grammar）。一个解析器构建系统，通过将一个语法（grammar）的描述声明转换成有效解析器。这也是本例中使用的方式。
+ 使用 CodeMirror 5 的[流解析器](https://codemirror.net/docs/ref/#language.StreamParser)方式，大多只是一个分词器（tokenizer）。这种方式在实现非常基础高亮比较容易，但不能产出结构化的语法（syntax）树，如果你想要的不只是分词，就不太行了，比如从变量名中区分类型名。
+ 编写完全自定义解析器。这大概是实现像 [Markdown](https://github.com/codemirror/lang-markdown) 这类简单语言唯一的方式，但往往需要做很多事情。

基本上，不太可能使用现存的解析器，它们基于不同解析目标被开发出来。本编辑器解析代码的方式需要是增量的，以便于它在文档更新时可以快速响应，而不是重新解析整个文档。也需要具有容错能力，即使您的文件中有语法错误也不会让高亮失效。最后，在它生成高亮可以使用语法树的[格式](https://lezer.codemirror.net/docs/ref/#common.Tree)时也同样实用。很少有解析器可以满足这些条件。

如果想要定义一个正常[上下文无关语法](https://en.wikipedia.org/wiki/Context-free_language)的语言，您可以基于 Lezer 语法实现（难易程度取决于语言使用了多少“狡猾的技巧”）。几乎所有语言都会做一个不符合上下文无关形式的事情，但 Lezer 有一些机制可以处理。

Lezer [指南](https://lezer.codemirror.net/docs/guide/#writing-a-grammar)提供有关编写语法更详细的解释。概括来说，Lezer 通过声明一系列 token，将文档分割成有意义的片段（标识符、字符串、注释，括号等等），再根据这些 token 和其他规则描述更大的结构。

Lezer 标记借鉴 Backus-Naur 标记拓展后和正则表达式语法，使用 `|` 表示或，`*` 和 `+` 表示重复，`?` 表示可选元素。

这种语法需要放入使用 `.grammar` 拓展名文件中，通过 [lezer-generator](https://lezer.codemirror.net/docs/guide/#building-a-grammar) 生成一个 JavaScript 文件。

如果想学习怎么编写一个 Lezer 语法，可以通过该网站查看一些[案例](https://lezer.codemirror.net/examples/)。

如果您定义的语法的文件名为 `example.grammar`, 可以通过运行 `lezer-generator example.grammar` 来创建一个 JavaScript 模块存储解析表。或者，和[案例仓库中](https://github.com/codemirror/lang-example)一样，使用 [Rollup](https://rollupjs.org/) 插件提供的工具来构建，以便于您可以直接从语法文件导入解析表。

## CodeMirror 集成

Lezer 是一个通用解析器工具，我们定义的语法与高亮等编辑器相关功能解耦。

Lezer 解析器有很多[节点类型](https://lezer.codemirror.net/docs/ref/#common.NodeType)，每种都有[属性](https://lezer.codemirror.net/docs/ref/#common.NodeProp)可以添加额外的元数据。我们创建一个拓展副本来包含节点指定的信息提供给高亮，缩进和折叠。

``` javascript
import { parser } from "./parser.js"
import { foldNodeProp, foldInside, indentNodeProp } from "@codemirror/language"
import { styleTags, tags as t } from "@lezer/highlight"

let parserWithMetadata = parser.configure({
  props: [
    styleTags({
      Identifier: t.variableName,
      Boolean: t.bool,
      String: t.string,
      LineComment: t.lineComment,
      "( )": t.paren
    }),
    indentNodeProp.add({
      Application: context => context.column(context.node.from) + context.unit
    }),
    foldNodeProp.add({
      Application: foldInside
    })
  ]
})
```
[styleTags](https://lezer.codemirror.net/docs/ref/#highlight.styleTags) 是一个附加高亮信息的辅助函数。我们传递一个映射节点名称的对象（或者以空格分割的节点名称列表）来[高亮标签](https://lezer.codemirror.net/docs/ref/#highlight.tags)。[高亮器](https://codemirror.net/docs/ref/#language.HighlightStyle)通用这些标签描述元素的语法规则美化文本。

通过 `@detecDelim` 添加的信息本来已经能够完成合理的自动补全，但因为 Lisps 倾向于给连续列表项添加一个缩进（相对于列表起始位置），这种默认行为与 C，JavaScript 中缩进括号中的内容相似，因此我们得重写它。

[indentNodeProp](https://codemirror.net/docs/ref/#language.indentNodeProp) 将计算缩进的函数与节点类型相关联。向函数传递一个[上下文对象](https://codemirror.net/docs/ref/#language.TreeIndentContext)，包含相关值和一些与缩进相关的辅助方法。上述案例中，该函数计算应用节点起始处的列位置并添加一个[缩进单位](https://codemirror.net/docs/ref/#language.indentUnit)。[语言包](https://codemirror.net/docs/ref/#language)导出很多辅助函数好让您更容易实现通用缩进样式。

[foldNodeProp](https://codemirror.net/docs/ref/#language.foldNodeProp) 将折叠信息与节点类型相关联。案例中，我们允许应用节点折叠后隐藏所有信息（除了分隔符）。

Lezer 提供给我们一个解析器，解析器输出的编码包含编辑器使用所需要的信息。接着，我们需要将 `parserWithMetadata` 包裹在一个[语言](https://codemirror.net/docs/ref/#language.Language)实例中，实例封装了一个解析器，并添加了一个语言特定的[方面](https://codemirror.net/docs/ref/#state.Facet)，外部代码可以使用该方面来注册语言特定的元数据。

``` javascript
import { LRLanguage } from "@codemirror/language"

export const exampleLanguage = LRLanguage.define({
  parser: parserWithMetadata,
  languageData: {
    commentTokens: {line: ";"}
  }
})
```

上述代码提供一小段元数据（行注释语法），并允许我们执行类似操作来添加其他信息，例如该语言的[自动补全](https://codemirror.net/docs/ref/#autocomplete.CompletionSource)：

``` javascript
import { completeFromList } from "@codemirror/autocomplete"

export const exampleCompletion = exampleLanguage.data.of({
  autocomplete: completeFromList([
    { label: "defun", type: "keyword" },
    { label: "defvar", type: "keyword" },
    { label: "let", type: "keyword" },
    { label: "cons", type: "function" },
    { label: "car", type: "function" },
    { label: "cdr", type: "function" }
  ])
})
```
最后一步，语言包通常会导出一个主函数（以语言命名，比如 `@codemirror/lang-css` 命名为 css），主函数接收一个配置对象（如果语言需要做一些配置）并返回一个 [LanguageSupport](https://codemirror.net/docs/ref/#language.LanguageSupport) 对象，该对象将语言实例与其他您可能希望为该语言启用的任何支持扩展捆绑在一起。

``` javascript
import { LanguageSupport } from "@codemirror/language"

export function example() {
  return new LanguageSupport(exampleLanguage, [exampleCompletion])
}
```
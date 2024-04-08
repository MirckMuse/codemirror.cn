# 案例：编写语言包

CodeMirror 通过特定包支持语言（命名像是：`@codemirror/lang-python` 或 `codemirror-lang-elixir`），这类包实现了使用语言需要的一些特性。可以是：

+ 语言解析器。
+ 附加的语法（syntax）关联元数据，比如：高亮、缩进和折叠信息。
+ 各种语言特定拓展【可选】，比如：支持自动补全和语言特定的按键绑定。

本例中，我们会实现一个类似 Lisp 语言非常迷你的语言包。Git 仓库[codemirror/lang-example](codemirror/lang-example)是个语言示例，带有构建工具配置等设置。这对于一开始构建属于自己的包非常有帮助。

## 解析

我们首先需要一个解析器，用作高亮上，同样也提供语法（syntax）感知选择，自动补全和代码折叠的结构信息。CodeMirror 有多种方式可以实现一个解析器。

+ 使用 Lezer 语法（grammar）。一个解析器构建系统，通过将一个语法（grammar）的描述声明转换成有效解析器。这也是本例中使用的方式。
+ 使用 CodeMirror 5 的流解析器方式，大多只是一个分词器（tokenizer）。这种方式在实现非常基础高亮比较容易，但不能产出结构化的语法（syntax）树，如果你想要的不只是分词，就不太行了，比如从变量名中区分类型名。
+ 编写完全自定义解析器。这大概是实现像 Markdown 这类简单语言唯一的方式，但往往需要做很多事情。

基本上，不太可能使用现存的解析器，它们基于不同解析目标被开发出来。本编辑器解析代码的方式需要是增量的，以便于它在文档更新时可以快速响应，而不是重新解析整个文档。也需要具有容错能力，即使您的文件中有语法错误也不会让高亮失效。最后，在它生成高亮可以使用语法树的格式时也同样实用。很少有解析器可以满足这些条件。

如果想要定义一个正常上下文无关语法的语言，您可以基于 Lezer 语法实现（难易程度取决于语言使用了多少“狡猾的技巧”）。几乎所有语言都会做一个不符合上下文无关形式的事情，但 Lezer 有一些机制可以处理。

Lezer 指南提供有关编写语法更详细的解释。概括来说，Lezer 通过声明一系列 token，将文档分割成有意义的片段（标识符、字符串、注释，括号等等），再根据这些 token 和其他规则描述更大的结构。

Lezer 标记借鉴 Backus-Naur 标记拓展后和正则表达式语法，使用 `|` 表示或，`*` 和 `+` 表示重复，`?` 表示可选元素。

这种语法需要放入使用 `.grammar` 拓展名文件中，通过 `lezer-generator` 生成一个 JavaScript 文件。

如果想学习怎么编写一个 Lezer 语法，可以通过该网站查看一些案例。

如果您定义的语法的文件名为 `example.grammar`, 可以通过运行 `lezer-generator example.grammar` 来创建一个 JavaScript 模块存储解析表。或者，和案例仓库中一样，使用 Rollup 插件提供的工具来构建，以便于您可以直接从语法文件导入解析表。

## CodeMirror 集成

Lezer 是一个通用解析器工具，我们定义的语法与高亮等编辑器相关功能解耦。

Lezer 解析器有很多节点类型，每种都有属性可以添加额外的元数据。我们创建一个拓展副本来包含节点指定的信息提供给高亮，缩进和折叠。

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
`styleTags` 是一个附加高亮信息的辅助函数。我们传递一个映射节点名称的对象（或者以空格分割的节点名称列表）来高亮标签。高亮器通用这些标签描述元素的语法规则美化文本。

The information added by @detectDelim would already allow the automatic indentation to do a reasonable job, but because Lisps tend to indent continued lists one unit beyond the start of the list, and the default behavior is similar to how you'd indent parenthesized things in C or JavaScript, we'll have to override it.

The indentNodeProp prop associates functions that compute an indentation with node types. The function is passed a context object holding the relevant values and some indentation-related helper methods. In this case, the function computes the column position at the start of the application node and adds one indent unit to that. The language package exports a number of helpers to easily implement common indentation styles.

Finally, foldNodeProp associates folding information with node types. We allow application nodes to be folded by hiding everything but their delimiters.

That gives us a parser with enough editor-specific information encoded in its output to use it for editing. Next we wrap that in a Language instance, which wraps a parser and adds a language-specific facet that can be used by external code to register language-specific metadata.

``` javascript
import { LRLanguage } from "@codemirror/language"

export const exampleLanguage = LRLanguage.define({
  parser: parserWithMetadata,
  languageData: {
    commentTokens: {line: ";"}
  }
})
```

That code provides one piece of metadata (line comment syntax) right away, and allows us to do something like this to add additional information, such as the an autocompletion source for this language.

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
Finally, it is convention for language packages to export a main function (named after the language, so it's called css in @codemirror/lang-css for example) that takes a configuration object (if the language has anything to configure) and returns a LanguageSupport object, which bundles a Language instance with any additional supporting extensions that one might want to enable for the language.

``` javascript
import { LanguageSupport } from "@codemirror/language"

export function example() {
  return new LanguageSupport(exampleLanguage, [exampleCompletion])
}
```
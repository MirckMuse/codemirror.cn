# 案例：混合语言解析

很多文件格式内包含其他格式，比方说说 HTML 里面的 `<script>` 标签包含 JavaScript，JavaScript 模板文字中也可以包含 HTML，还有包裹其他语言处理指令的模板语言。

[Lezer](https://lezer.codemirror.net/) 和 CodeMirror 处理此问题的方法是将复合语言视为外部语言（解析整个文档）和一个或多个内部语言（仅解析某些区域，由外部解析树的结构决定）的组合。

## 分层嵌套

比方说，HTML 包含 CSS 和 JavaScript。它提供 `<style>` 和 `<script>` 标签作为外部结构，结构的内容会交给 CSS 和 JavaScript 解析器处理。在模板语言中，外部解析器会解析这种指令语法，并确定在文档中的结构，并塞入到目标语言的两个指令中间。

处理这类解析的功能是[parseMixed](https://lezer.codemirror.net/docs/ref/#common.parseMixed)，可以[附加](https://lezer.codemirror.net/docs/ref/#lr.ParserConfig.wrap)一个外部解析器来管理内部解析过程。

让我们假装 [`@codemirror/lang-html`](https://github.com/codemirror/lang-html) 包没有提供混合语言解析，然后自己实现解析 `<script>` 标签的解析：

``` javascript
import { parser as htmlParser } from "@lezer/html"
import { parser as jsParser } from "@lezer/javascript"
import { parseMixed } from "@lezer/common"
import { LRLanguage } from "@codemirror/language"

const mixedHTMLParser = htmlParser.configure({
  wrap: parseMixed(node => {
    return node.name == "ScriptText" ? { parser: jsParser } : null
  })
})

const mixedHTML = LRLanguage.define({ parser: mixedHTMLParser })
```

提供给函数的 parseMixed 会被外部数的节点调用，然后决定节点内容是否应该被这个嵌套的解析器解析。案例中的 HTML 解析器简单提供 `ScriptText` 语法树节点作为 `<script>` 标签的内容，并告诉混合解析器这个节点的内容应该使用 JavaScript 解析器来解析，然后[挂载](https://lezer.codemirror.net/docs/ref/#common.NodeProp%5Emounted)结果树取代接 ScriptText 节点。


然后您会发现，两种语言的高亮都能正常工作。（很多功能应该已经丢失了，因为这个代码跳过了一些事情，比方说 `@codemirror/lang-html` 和 `@codemirror/lang-javascript` 中定义的折叠信息和自动补全等等）。

## 覆盖嵌套

上面的场景，嵌套区域和外部语言的结构对应（脚本文本是独立节点），覆盖 HTML 标签的内容。在其他一些混合语言系统，嵌套不是那么简单。例如，在 [`Twig`](https://twig.symfony.com/) 模板语言中，模板指令的嵌套可能和模板中 HTML 的嵌套不匹配，就像这个有点奇怪的模板：

``` Twig
<div>
  {{ content }}
{% if extra_content %}
  <hr></div><div class=extra>{{ extra_content }}
{% endif %}
  <hr>
</div>
```

我们可以使用模板语法作为外部语言，解析文档看起来如下：

``` javascript
Template(
  Text("<div>"),
  Insert("content"),
  Conditional(
    ConditionalOpen("extra_content"),
    Text("<hr></div><div class=extra>"),
    Insert("extra_content"),
    ConditionalClose
  ),
  Text("<hr></div>")
)
```

但是在解析这个 HTML 文本时，语法树中没有独立节点可以作为目标 —— 被分隔成多个节点，放在不同的父节点中。

Lezer 这样的嵌套模型是使用一个“覆盖”的树。 覆盖不是替换给定的节点，而是用来自不同树的内容覆盖它的部分。

假设我们有一个外部解析器的 [grammar](https://codemirror.net/examples/mixed-language/twig.grammar.txt)，我们可以这么定义一个混合解析器：

``` javascript
import { parser as twigParser } from "./twig-parser.js"
import { htmlLanguage } from "@codemirror/lang-html"
import { foldNodeProp, foldInside, indentNodeProp } from "@codemirror/language"

const mixedTwigParser = twigParser.configure({
  props: [
    // Add basic folding/indent metadata
    foldNodeProp.add({ Conditional: foldInside }),
    indentNodeProp.add({Conditional: cx => {
      let closed = /^\s*\{% endif/.test(cx.textAfter)
      return cx.lineIndent(cx.node.from) + (closed ? 0 : cx.unit)
    }})
  ],
  wrap: parseMixed(node => {
    return node.type.isTop ? {
      parser: htmlLanguage.parser,
      overlay: node => node.type.name == "Text"
    } : null
  })
})

const twigLanguage = LRLanguage.define({ parser: mixedTwigParser })
```

现在，我们给模板顶级节点设置了混合解析，也从回调返回的对象中放入覆盖属性。覆盖属性可以是一个要解析的范围数组，也可以是针对每个子节点调用的另一个函数。当目标节点可能很大时，后一种方法更可取，因为它可以做更高效的增量重解析。

注意：因为我们使用 `@codemirror/lang-html` 中的HTML 解析器，案例中的编辑器也同样可以解析 `<script>` 和 `<style>` 标签。也可以嵌套混合解析器。

## 支持扩展

CodeMirror [languageDataAt](https://codemirror.net/docs/ref/#state.EditorState.languageDataAt) 特性可以用来查询与文档中指定位置语言的关联值。如果您使用这个机制定义像是自动补全这样的功能，它会自动从混合语言文档中查找适当的补全源。

``` javascript
const twigAutocompletion = twigLanguage.data.of({
  autocomplete: context => /* Twig completion logic here */ null 
})
```

建议混合语言扩展包含其嵌套语言扩展的所有支持扩展 —— 扩展加载到编辑器中才能生效。例如：上述编辑器没有加载 HTML 支持拓展，所以没有 HTML 自动补全功能。下面 `twig` 函数暴露了两种语言和对应的支持拓展：

``` javascript
import { html } from "@codemirror/lang-html"

export function twig() {
  return [
    twigLanguage,
    twigAutocompletion,
    html().support
  ]
}
```

把这个支持拓展加载到编辑器中会提供 HTML（JavaScript 和 CSS）的补全支持。

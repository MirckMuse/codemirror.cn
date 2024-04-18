# 案例：从右到左文本

想要创建一个阿拉伯语或希伯来语文本的基本编辑器，您只需要设置编辑器的样式或者给一些父文档设置方向: rtl 属性。

然而，在代码编辑器的上下文中，您可能需要处理大量的拉丁文语法或标记名，因此从左到右的文本需求会变成更麻烦的双向文本需求。其实，编辑混合方向的文本会让人困惑和混乱，CodeMirror 尽可能让它变得可以忍受。

光标移动（默认的按键映射定义）是可见的，如果按左箭头按键您的光标应该向左移动，不管光标位置的文本方向是什么。

一些其他命令则是按照逻辑方向执行 —— 例如：`Backspace` 删除光标签的内容，在从左到右的文本中会删除左边的文本，在从右到左的文本中则删除右边的文本。类似地，`Delete` 删除光标后面的文本。

当您定义自定义命令是可见的，您需要注意当前文本方向，然后决定用什么方式使用（可能需要用到前置参数像是 moveByChar）。

``` javascript
function cursorSemicolonLeft(view: EditorView) {
  let from = view.state.selection.main.head
  let dir = view.textDirectionAt(from)
  let line = view.state.doc.lineAt(from)
  let found = dir == Direction.LTR
    ? line.text.lastIndexOf(";", from - line.from)
    : line.text.indexOf(";", from - line.from)
  if (found < 0) return false
  view.dispatch({
    selection: { anchor: found + line.from },
    scrollIntoView: true,
    userEvent: "select"
  })
  return true
}
```

在编写拓展的时候，需要注意文本方向而不是假定是从左到右的布局。编辑设置您的 CSS 使用 `direction-aware` 属性，如果不管用，那就得检查全局编辑器的方向，并根据该方向调整您的行为。

## 双向隔离

双向程序设计或者标记文本常见的问题是，用于文本布局的标准算法将两段定向文本之间的中性标点符号与错误的一侧相关联。例如，请参阅从右到左的HTML代码：

A common issue with bidirectional programming or markup text is that the standard algorithm for laying the text out associates neutral punctuation characters between two pieces of directional text with the wrong side. See for example this right-to-left HTML code:

<pre style="text-align: right">
  &lt;/span>الأزرق&lt;span class="blue">النص 
</pre>

Though in the logical text, the \<span class="blue"\> appears as a coherent string, the algorithm will consider the punctuation "\> to be part of the nearby right-to-left text, because that is the line's base direction. This results in an unreadable mess.

Thus, it can be useful to add elements with a unicode-bidi: isolate style around sections that should be ordered separate from the surrounding text. This bit of code does that for HTML tags:

``` javascript
import {
  EditorView, 
  Direction, 
  ViewPlugin, 
  ViewUpdate,
  Decoration,
  DecorationSet
} from "@codemirror/view"
import { Prec } from "@codemirror/state"
import { syntaxTree } from "@codemirror/language"
import { Tree } from "@lezer/common"

const htmlIsolates = ViewPlugin.fromClass(
  class {
    isolates: DecorationSet
    tree: Tree

    constructor(view: EditorView) {
      this.isolates = computeIsolates(view)
      this.tree = syntaxTree(view.state)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged ||
          syntaxTree(update.state) != this.tree) {
        this.isolates = computeIsolates(update.view)
        this.tree = syntaxTree(update.state)
      }
    }
  },
  {
    provide: plugin => {
      function access(view: EditorView) {
        return view.plugin(plugin)?.isolates ?? Decoration.none
      }
      return Prec.lowest([
        EditorView.decorations.of(access),
        EditorView.bidiIsolatedRanges.of(access)
      ])
    }
  }
)
```

This computes a set of decorations and keeps it up to date as the editor state changes. It provides the set to both the decoration and isolated range facets—the first makes sure the editable HTML is rendered appropriately, the second that CodeMirror's own order computations match the rendered order.

Because styling something as isolated only works if it is rendered as a single HTML element, we don't want other decorations to break up the isolating decorations. Because lower-precedence decorations are rendered around higher-precedence ones, we use Prec.lowest to give this extension a very low precedence.

computeIsolates uses the syntax tree to compute decorations for HTML tags in the visible ranges.

``` javascript
import { RangeSetBuilder } from "@codemirror/state"

const isolate = Decoration.mark({
  attributes: { style: "direction: ltr; unicode-bidi: isolate" },
  bidiIsolate: Direction.LTR
})

function computeIsolates(view: EditorView) {
  let set = new RangeSetBuilder<Decoration>()
  for (let { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter(node) {
        if (
          node.name == "OpenTag" ||
          node.name == "CloseTag" ||
          node.name == "SelfClosingTag"
        ) {
          set.add(node.from, node.to, isolate)
        }
      }
    })
  }
  return set.finish()
}
```

Here's an editor showing this extension in action. Note that the HTML tags are shown coherently left-to-right.

# 案例：从右到左文本

想要创建一个阿拉伯语或希伯来语文本的基本编辑器，您只需要设置编辑器的样式或者给一些父文档设置方向: rtl 属性。

然而，在代码编辑器的上下文中，您可能需要处理大量的拉丁文语法或标记名，因此从左到右的文本需求会变成更麻烦的双向文本需求。其实，编辑混合方向的文本会让人困惑和混乱，CodeMirror 尽可能让它变得可以忍受。

光标移动（[默认](https://codemirror.net/docs/ref/#commands.defaultKeymap)的按键映射定义）是可见的，如果按左箭头按键您的光标应该向左移动，不管光标位置的文本方向是什么。

一些其他命令则是按照逻辑方向执行 —— 例如：`Backspace` 删除光标签的内容，在从左到右的文本中会删除左边的文本，在从右到左的文本中则删除右边的文本。类似地，`Delete` 删除光标后面的文本。

当您定义自定义命令是可见的，您需要注意[当前文本方向](https://codemirror.net/docs/ref/#view.EditorView.textDirectionAt)，然后决定用什么方式使用（可能需要用到前置参数像是 [moveByChar](https://codemirror.net/docs/ref/#view.EditorView.moveByChar)）。

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

在编写拓展的时候，需要注意文本方向而不是假定是从左到右的布局。编辑设置您的 CSS 使用 [`direction-aware` 属性](https://drafts.csswg.org/css-logical/#position-properties)，如果不管用，那就得检查[全局编辑器的方向](https://codemirror.net/docs/ref/#view.EditorView.textDirection)，并根据该方向调整您的行为。

## 双向隔离

双向程序设计或者标记文本常见的问题是，用于文本布局的标准算法将两段定向文本之间的中性标点符号与错误的一侧相关联。例如，请参阅从右到左的HTML代码：

<pre style="text-align: right">
  &lt;/span>الأزرق&lt;span class="blue">النص 
</pre>

尽管在该文本中，`<span class="blue">` 看起来是连贯的字符串，而算法会考虑 `\>` 符号考虑怎么贴近从右到左文本，这是因为这是该行的基础方向。当然，结果就有点难易阅读了。

因此，在应该与周围文本分开排序的部分周围添加具有[unicode-bidi: isolate](https://developer.mozilla.org/en-US/docs/Web/CSS/unicode-bidi#isolate)样式的元素是有用的。这段代码为HTML标签做了这件事：

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
      if (
        update.docChanged || update.viewportChanged ||
        syntaxTree(update.state) != this.tree
      ) {
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

`computeIsolates` 计算一系列[装饰器](https://codemirror.net/examples/decoration/)并确保和编辑器状态的变更保持一致。它提供包含[装饰器](https://codemirror.net/docs/ref/#view.EditorView.decorations)和[隔离区域](https://codemirror.net/docs/ref/#view.EditorView.bidiIsolatedRanges) facet集合，首先确保可编辑的HTML被适当渲染，其次确保 CodeMirror 自己计算的顺序与渲染顺序相匹配。

因为隔离样式只能添加给单独 HTML 元素才能生效，我们不希望其他装饰器破坏这个隔离装饰器。因为低优先级的装饰器被渲染在高优先级周围，我们使用 [`Prec.lowest`](https://codemirror.net/docs/ref/#state.Prec.lowest) 给这个拓展设置一个非常低的优先级。

`computeIsolates` 使用语法树计算装饰器在可视范围的 HTML 标签。

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

这有个编辑器展示了拓展的作用。可以注意 HTML 标签显示连贯的从左到右文本。

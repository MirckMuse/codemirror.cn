# 案例：槽

[视图模块](https://codemirror.net/docs/ref/#h_gutters)提供给编辑器增加槽（代码前面的竖杠）的功能。槽最简单的用法是通过给配置项添加 [lineNumbers()](https://codemirror.net/docs/ref/#view.lineNumbers) 来增加行号槽。视图模块也同样可以帮助您定义自己的槽来显示自定义控件。

## 新加槽

概念上，编辑器会并排显示一组槽，每个槽都有自己的样式和内容（尽管您通常希望保留其默认样式，以便它们与其他槽融合，看起来像一个大槽）。对于每一行，每个槽都可能显示一些内容。很明显行号槽将显示一个行号。

若要添加[槽](https://codemirror.net/docs/ref/#view.gutter)，请调用槽函数并将结果包含在状态配置中。该拓展相对其他槽拓展的位置决定了槽的顺序。例如，把我们的定义的槽放在行号后面：

``` javascript
extensions: [lineNumbers(), gutter({ class: "cm-mygutter" })]
```

除非 `cm-mygutter` CSS 样式类设置最小宽度，不然是无法看到刚刚定义的槽 —— 它目前只是一个空元素（CSS 为 flexbox），浏览器会折叠它。

想要在 gutter 放一下东西，我们可以使用 [`lineMarker`](https://codemirror.net/docs/ref/#view.gutter%5Econfig.lineMarker) 和 `markers` 两个选项中的一个，`lineMarker` 选项会被每个可视行调用来决定是否展示，`markers` 允许您构建一个持久标记集（和[装饰器](/example/decoration)中相同的[范围集](https://codemirror.net/docs/ref/#state.RangeSet)数据结构）来显示槽。

和装饰器一样，槽标记用轻量不可变值表示，并通过这些值来渲染 DOM 节点，为了以声明的方式表示更新，而无需在每个事务上重新创建大量DOM节点。。槽标记可以给槽元素[添加 CSS 样式类](https://codemirror.net/docs/ref/#view.GutterMarker.elementClass)。

下面代码定义两个槽，其中一个给每个空行添加 `ø` 标记， 另外一个可以让您点击槽来切换断点。实现第一个槽比较容易：

``` typescript
import { EditorView, gutter, GutterMarker } from "@codemirror/view"

const emptyMarker = new class extends GutterMarker {
  toDOM() { return document.createTextNode("ø") }
}

const emptyLineGutter = gutter({
  lineMarker(view, line) {
    return line.from == line.to ? emptyMarker : null
  },
  initialSpacer: () => emptyMarker
})
```

（`new class` 构造创建了一个匿名类并初始化了一个实例。因为我们只有一种类型的空行标记，我们使用它来获取我们的 GutterMarker 实例。）

为了避免空槽不展示的问题，可以给槽[配置](https://codemirror.net/docs/ref/#view.gutter%5Econfig.initialSpacer) `spacer` 给槽中不可见元素设置最小宽度。这通常比使用CSS设置显式并确保其覆盖预期内容更容易。

`lineMarker` 选项可以检查 0 宽行，如果是，则返回我们的标记。

断点槽则有点复杂。它需要追踪状态（断点的位置），为此我们需要使用一个[状态字段](https://codemirror.net/docs/ref/#state.StateField)，具有更新[状态的效果](https://codemirror.net/docs/ref/#state.StateEffect)。

``` typescript
import { StateField, StateEffect, RangeSet } from "@codemirror/state"

const breakpointEffect = StateEffect.define<{ pos: number, on: boolean }>({
  map: (val, mapping) => ({ pos: mapping.mapPos(val.pos), on: val.on })
})

const breakpointState = StateField.define<RangeSet<GutterMarker>>({
  create() { return RangeSet.empty },
  update(set, transaction) {
    set = set.map(transaction.changes)
    for (let e of transaction.effects) {
      if (e.is(breakpointEffect)) {
        if (e.value.on)
          set = set.update({ add: [breakpointMarker.range(e.value.pos)] })
        else
          set = set.update({ filter: from => from != e.value.pos })
      }
    }
    return set
  }
})

function toggleBreakpoint(view: EditorView, pos: number) {
  let breakpoints = view.state.field(breakpointState)
  let hasBreakpoint = false
  breakpoints.between(pos, pos, () => { hasBreakpoint = true })
  view.dispatch({
    effects: breakpointEffect.of({ pos, on: !hasBreakpoint })
  })
}
```

状态一开始是空的，当事务发生时，会根据变更（如果有）[映射](https://codemirror.net/docs/ref/#state.ChangeDesc.mapPos)断点的位置，查找新增或者移除断点的效果，酌情调整断点集。

`breakpointGutter` 拓展将槽的状态字段和槽的一些样式结合在一起。

``` javascript
const breakpointMarker = new class extends GutterMarker {
  toDOM() { return document.createTextNode("💔") }
}

const breakpointGutter = [
  breakpointState,
  gutter({
    class: "cm-breakpoint-gutter",
    markers: v => v.state.field(breakpointState),
    initialSpacer: () => breakpointMarker,
    domEventHandlers: {
      mousedown(view, line) {
        toggleBreakpoint(view, line.from)
        return true
      }
    }
  }),
  EditorView.baseTheme({
    ".cm-breakpoint-gutter .cm-gutterElement": {
      color: "red",
      paddingLeft: "5px",
      cursor: "default"
    }
  })
]
```

[`domEventHandlers`](https://codemirror.net/docs/ref/#view.gutter%5Econfig.domEventHandlers) 选项可以让您给槽添加一个事件处理器，我们设置了 `mousedown` 事件处理器在点击时切换行的断点。

这就是一个在行号前有断点槽、在行号后有空行槽的编辑器的样子：

## 自定义行号槽

[`lineNumbers`](https://codemirror.net/docs/ref/#view.lineNumbers) 函数同样可以接收一个配置参数，然您可以添加[事件处理器](https://codemirror.net/docs/ref/#view.lineNumbers%5Econfig.domEventHandlers)或者自定义行号[显示](https://codemirror.net/docs/ref/#view.lineNumbers%5Econfig.formatNumber)的方式。

``` javascript
const hexLineNumbers = lineNumbers({
  formatNumber: n => n.toString(16)
})
```

同样也可以给行号槽添加标记，来替换效果行的行号。这通过 [`lineNumberMarkers`](https://codemirror.net/docs/ref/#view.lineNumberMarkers) facet 实现，它与在自定义槽上添加标记非常相似，但是由任意拓展提供，而不是直接给单个槽配置。

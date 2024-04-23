# 案例：斑马条纹

本案例定义一个拓展给偶数行添加背景颜色样式。

添加条纹样式需要重写[主题](https://codemirror.net/docs/ref/#view.EditorView%5Etheme)，我们需要定义[基础主题](https://codemirror.net/docs/ref/#view.EditorView%5EbaseTheme)。主题需要添加 `cm-zebraStripe` 样式类，分别在亮色和暗色主题下显示不同的背景色。

``` javascript
import { EditorView } from "@codemirror/view"

const baseTheme = EditorView.baseTheme({
  "&light .cm-zebraStripe": { backgroundColor: "#d4fafa" },
  "&dark .cm-zebraStripe": { backgroundColor: "#1a2727" }
})
```

然后，作为包含配置功能的拓展，我们将允许调用者配置条纹之间的距离。为了以定义良好的方式存储配置的距离，即使添加了扩展的多个实例，我们也会将其存储在一个 [facet](https://codemirror.net/docs/ref/#state.Facet) 中。

这个 facet 采用任意数量的步长值（输入类型为数字、第一个类型参数），并采用它们的最小值，或者如果没有提供值，则取2作为其值（输出类型、第二个类型参数以及数字）。

``` typescript
import { Facet } from "@codemirror/state"

const stepSize = Facet.define<number, number>({
  combine: values => values.length ? Math.min(...values) : 2
})
```

我们导出单一函数，函数返回安装斑马条纹功能的[拓展](https://codemirror.net/docs/ref/#state.Extension)。

注意：拓展值可以是独立拓展（比如：[方法](https://codemirror.net/docs/ref/#state.Facet.of)创建的facet 值），拓展数组，当然也可能是嵌套拓展。因此，它们可以很容易被组合进更大的拓展里面。

在这种情况下，如果提供了配置，该函数将返回我们的基本主题，即 `stepSize` facet 的值，以及 `showStripes`，即实际添加样式的[视图插件](https://codemirror.net/docs/ref/#view.ViewPlugin)，我们稍后将对此进行定义。

``` typescript
import { Extension } from "@codemirror/state"

export function zebraStripes(options: { step?: number } = {}): Extension {
  return [
    baseTheme,
    options.step == null ? [] : stepSize.of(options.step),
    showStripes
  ]
}
```

首先，给定一个视图，这个辅助函数在可见行上迭代，为每个偶数行创建一个[行装饰](https://codemirror.net/docs/ref/#view.Decoration%5Eline)。

插件只需在每次发生变化时重新计算其装饰即可。使用[构建器](https://codemirror.net/docs/ref/#state.RangeSetBuilder)，这不是很昂贵。在其他情况下，最好在更新中保留装饰（通过文档更改[映射](https://codemirror.net/docs/ref/#state.RangeSet.map)它们）。

注意，因为 facet 在每个状态下都是可用的，无论它们是否已添加到该状态，我们都可以简单地[读取](https://codemirror.net/docs/ref/#state.EditorState.facet)stepSize的值以获得适当的步长。当没有配置它时，它的值为2（用空数组调用其组合函数的结果）。

``` typescript
import { Decoration } from "@codemirror/view"
import { RangeSetBuilder } from "@codemirror/state"

const stripe = Decoration.line({
  attributes: { class: "cm-zebraStripe" }
})

function stripeDeco(view: EditorView) {
  let step = view.state.facet(stepSize)
  let builder = new RangeSetBuilder<Decoration>()
  for (let {from, to} of view.visibleRanges) {
    for (let pos = from; pos <= to;) {
      let line = view.state.doc.lineAt(pos)
      if ((line.number % step) == 0)
        builder.add(line.from, line.from, stripe)
      pos = line.to + 1
    }
  }
  return builder.finish()
}
```

`showStripes` [视图插件](https://codemirror.net/docs/ref/#view.ViewPlugin)只需要它时提供了装饰（装饰选项），并确保在文档或[可视窗口](https://codemirror.net/docs/ref/#view.EditorView.viewport)更改时重新计算其装饰属性。

``` typescript
import { ViewPlugin, DecorationSet, ViewUpdate } from "@codemirror/view"

const showStripes = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = stripeDeco(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged)
        this.decorations = stripeDeco(update.view)
    }
  }, 
  {
    decorations: v => v.decorations
  }
)
```

结果如下：
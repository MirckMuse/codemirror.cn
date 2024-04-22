# 案例：斑马条纹

本案例定义一个拓展给偶数行添加背景颜色样式。

添加条纹样式需要重写主题，我们需要定义基础主题。主题需要添加 `cm-zebraStripe` 样式类，分别在亮色和暗色主题下显示不同的背景色。

``` javascript
import { EditorView } from "@codemirror/view"

const baseTheme = EditorView.baseTheme({
  "&light .cm-zebraStripe": { backgroundColor: "#d4fafa" },
  "&dark .cm-zebraStripe": { backgroundColor: "#1a2727" }
})
```

然后，作为包含配置功能的拓展，我们将允许调用者配置条纹之间的距离。为了存储配置的距离，TODO：

Next, as an excuse for including configuration functionality, we'll allow the caller to configure the distance between the stripes. To store the configured distance in a way that is well-defined even if multiple instances of the extension are added, we'll store it in a facet.

这个 facet 

The facet takes any number of step values (input type number, the first type parameter), and takes their minimum, or 2 if no values were provided, as its value (output type, the second type parameter, also number).

``` typescript
import { Facet } from "@codemirror/state"

const stepSize = Facet.define<number, number>({
  combine: values => values.length ? Math.min(...values) : 2
})
```

我们导出单一函数，函数返回安装斑马条纹功能的拓展。

注意：拓展值可以是独立拓展（比如：方法创建的facet 值），拓展数组，当然也可能是嵌套拓展。因此，它们可以很容易被组合进更大的拓展里面。

本案例中，函数返回基本主题、一个 stepSize facet 的值，如果

In this case, the function returns our base theme, a value for the stepSize facet, if a configuration was provided, and showStripes, the view plugin that actually adds the styling, which we'll define in a moment.

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

First, this helper function, given a view, iterates over the visible lines, creating a line decoration for every Nth line.

The plugin will simply recompute its decorations every time something changes. Using a builder, this is not very expensive. In other cases, it can be preferable to preserve decorations (mapping them through document changes) across updates.

Note that, because facets are always available on every state, whether they have been added to that state or not, we can simply read the value of stepSize to get the appropriate step size. When no one configured it, it'll have the value 2 (the result of calling its combine function with the empty array).

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

`showStripes` 视图插件，

The showStripes view plugin, then, only has to advertise that it provides decorations (the decorations option), and make sure its decorations property is recomputed when the document or the viewport changes.

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
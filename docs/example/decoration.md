# 案例：装饰器

CodeMirror 编辑器内部的 DOM 结构由编辑器自己管理。`cm-content` 元素内部，任何尝试增加属性或者修改节点结构，都会被编辑器立刻重置回之前的内容。

所以想要美化内容，修改内容或在两个内容中间新增额外元素，我们必须得通过编辑器来做这些事情。这也是[装饰器](https://codemirror.net/docs/ref/#view.Decoration)要做的事情。


## 装饰器类型

有 4 种类型的装饰器您可以加入到编辑器内容中：

+ [标记装饰器](https://codemirror.net/docs/ref/#view.Decoration%5Emark)：它最为常见。常用来新增属性或者包裹 DOM 元素到内容片段中。例如语法高亮就是通过标记装饰器实现的。
  
+ [小组件装饰器](https://codemirror.net/docs/ref/#view.Decoration%5Ewidget)：它可以在编辑器内容中插入一个 DOM 元素。可以用它做到什么事情呢，比方说，可以在颜色代码后面添加一个颜色选择器。小组件可以是行内元素或者[块级元素](https://codemirror.net/docs/ref/#view.Decoration%5Ewidget%5Espec.block)。

+ [替换装饰器](https://codemirror.net/docs/ref/#view.Decoration%5Ereplace)：它可以替换一段内容。常用来做代码折叠或者替换文本中的元素为其他内容。它也可以用[小组件](https://codemirror.net/docs/ref/#view.Decoration%5Ereplace%5Espec.widget)取代替换后的文本。

+ [行装饰器](https://codemirror.net/docs/ref/#view.Decoration%5Eline)：当它位于行的起始位置，可以影响包裹行的 DOM 元素的属性。

调用这些函数会返回一个装饰器对象，用来描述装饰器的类型，您可以在多个装饰器实例中复用。这些对象上的 [`range`](https://codemirror.net/docs/ref/#state.RangeValue.range) 方法为您提供了一个实际的装饰范围，它保存类型和一对`from/to`文档偏移量。

## 装饰器源

编辑器使用 [RangeSet](https://codemirror.net/docs/ref/#state.RangeSet) 数据结构提供装饰器，该数据结构存储一组值（在本例中为装饰器），并带有与之关联的范围（开始和结束位置）。当文档更改时，此数据结构有助于高效地更新大量装饰器中的位置。

编辑器视图通过 [facet](https://codemirror.net/docs/ref/#view.EditorView%5Edecorations) 提供装饰器。有 2 种方式，直接使用装饰器，通过调用视图实例的一个函数生成一系列装饰器。装饰器可以显著修改编辑器垂直方向的布局，比方说替换换行或者插入块级小组件，这类装饰器得直接提供，因为间接装饰器只能等到可视窗口计算出来后才能获取到。

间接装饰器常用做一些比如语法高亮，搜索匹配高亮的事情，如果只想在[可视窗口](https://codemirror.net/docs/ref/#view.EditorView.viewport)或者当前[可见区域](https://codemirror.net/docs/ref/#view.EditorView.visibleRanges)渲染装饰器，这种装饰器对性能非常有帮助。

让我们开始第一个案例，直接提供一个装饰器并保存它在状态中。

## 下划线命令

如果我们想要实现一个可以给部分文档添加下划线的编辑器拓展。我们可以定义一个[状态字段](https://codemirror.net/docs/ref/#state.StateField)来追踪需要添加下划线的部分文档，然后提供[标记装饰器](https://codemirror.net/docs/ref/#view.Decoration%5Emark)来绘制下划线。

为了保持代码简单，字段只存储装饰器的范围集。它不做连接重叠下划线之类的事情，而是将任何新下划线的区域转储到其范围集合中。

``` javascript
import { EditorView, Decoration, DecorationSet } from "@codemirror/view"
import { StateField, StateEffect } from "@codemirror/state"

const addUnderline = StateEffect.define<{ from: number, to: number }>({
  map: ({ from, to }, change) => ({ from: change.mapPos(from), to: change.mapPos(to) })
})

const underlineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(underlines, tr) {
    underlines = underlines.map(tr.changes)
    for (let e of tr.effects) if (e.is(addUnderline)) {
      underlines = underlines.update({
        add: [underlineMark.range(e.value.from, e.value.to)]
      })
    }
    return underlines
  },
  provide: f => EditorView.decorations.from(f)
})

const underlineMark = Decoration.mark({ class: "cm-underline" })
```

注意：更新方法一开始通过事务的变更[映射](https://codemirror.net/docs/ref/#state.RangeSet.map)它的范围。历史集指向的位置是历史文档，新的状态得获得新文档的位置信息，除非您完成重计算您的装饰集，不然您就得通过文档变更来映射。

然后它会检查事务中是否存在我们定义新增下划线的[副作用](https://codemirror.net/docs/ref/#state.StateEffect)，如果有的话，给装饰器集合添加额外的范围。

下面，我们要定义一个命令，当有文本被选中，给选中文本添加下划线。我们会让它按需自动开启这个状态字段（以及[基础主题](https://codemirror.net/docs/ref/#view.EditorView%5EbaseTheme)），不需要额外的配置。


``` javascript
const underlineTheme = EditorView.baseTheme({
  ".cm-underline": { textDecoration: "underline 3px red" }
})

export function underlineSelection(view: EditorView) {
  let effects: StateEffect<unknown>[] = view.state.selection.ranges
    .filter(r => !r.empty)
    .map(({ from, to }) => addUnderline.of({ from, to }))

  if (!effects.length) return false

  if (!view.state.field(underlineField, false)) {
    effects.push(
      StateEffect.appendConfig.of([
        underlineField,
        underlineTheme
      ])
    )
  }

  view.dispatch({ effects })
  return true
}
```

最后，给该命令绑定一个按键 `Ctrl-h` （MacOS上为 `Cmd-h`）。 这里设置 `preventDefault` 字段，是因为我们希望命令没有生效时，浏览器也不会触发默认行为。


``` javascript
import { keymap } from "@codemirror/view"

export const underlineKeymap = keymap.of([{
  key: "Mod-h",
  preventDefault: true,
  run: underlineSelection
}])
```

## 布尔值开关小组件

接下来，让我们看一个复选框小组件的插件，它出现在布尔值常量后面，用户可以通过点击反转该常量。

小组件装饰器不会直接包含它们的小组件 DOM。除了帮助在编辑器状态外保存可变对象，这种额外的间接级别让我们可以不用重绘 DOM 来重新创建小组件。我们待会会用小组件装饰器在文档改变时重新创建装饰器集。

首先，我们得定义 [`WidgetType`](https://codemirror.net/docs/ref/#view.WidgetType) 子类来绘制小组件。

``` javascript
import { WidgetType } from "@codemirror/view"

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) { super() }

  eq(other: CheckboxWidget) { return other.checked == this.checked }

  toDOM() {
    let wrap = document.createElement("span")
    wrap.setAttribute("aria-hidden", "true")
    wrap.className = "cm-boolean-toggle"
    let box = wrap.appendChild(document.createElement("input"))
    box.type = "checkbox"
    box.checked = this.checked
    return wrap
  }

  ignoreEvent() { return false }
}
```

装饰器包含这个类的实例（创建的代价很低）。如果视图更新时，发现小组件出现的位置上已经有一个小组件实例绘制了（通过`eq` 方法确定等效性），将会简单的重用这个实例。

还可以通过定义不同 [updateDOM](https://codemirror.net/docs/ref/#view.WidgetType.updateDOM) 方法来优化小组件（相同类型单不同内容）的 DOM 结构的更新。对于本例没有太多帮助。

使用`<span>` DOM元素来包裹 checkbox，更多是因为 Firefox 对处理 `contenteditable = false` 的 checkbox 支持很少（对于 `contenteditable` 的边缘处理，浏览器可能会出现各种问题）。我们同样需要告诉屏幕阅读者，这个功能如果没有点击设备是不能生效的。

最后，小组件的 `ignoreEvents` 方法告诉编辑器不要忽视小组件发生的事件。如果要处理编辑器和小组件的处理程序（待会定义），这个函数是必需要定义的。

下面的函数，使用编辑器的[语法树](https://codemirror.net/docs/ref/#language.syntaxTree)（假定 JavaScript 语言是开启的）来在编辑器可见部分定位布尔值常量，并创建小组件。

``` javascript
import { EditorView, Decoration } from "@codemirror/view"
import { syntaxTree } from "@codemirror/language"

function checkboxes(view: EditorView) {
  let widgets = []
  for (let { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter: (node) => {
        if (node.name == "BooleanLiteral") {
          let isTrue = view.state.doc.sliceString(node.from, node.to) == "true"
          let deco = Decoration.widget({
            widget: new CheckboxWidget(isTrue),
            side: 1
          })
          widgets.push(deco.range(node.to))
        }
      }
    })
  }
  return Decoration.set(widgets)
}
```

[视图插件](https://codemirror.net/docs/ref/#view.ViewPlugin)使用该函数，在文档或者可视窗口变化时，确保获取到最新的装饰器集。

``` javascript
import { ViewUpdate, ViewPlugin, DecorationSet } from "@codemirror/view"

const checkboxPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = checkboxes(view)
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged || update.viewportChanged ||
        syntaxTree(update.startState) != syntaxTree(update.state)
      ) {
        this.decorations = checkboxes(update.view)
      }
    }
  },
  {
    decorations: v => v.decorations,

    eventHandlers: {
      mousedown: (e, view) => {
        let target = e.target as HTMLElement
        if (
          target.nodeName == "INPUT" &&
          target.parentElement!.classList.contains("cm-boolean-toggle")
        ) {
          return toggleBoolean(view, view.posAtDOM(target))
        }
      }
    }
  }
)
```

传递给插件的选项告诉编辑器，首先它可以通过这个插件[获取](https://codemirror.net/docs/ref/#view.PluginSpec.decorations)装饰器，其次只要插件激活，需要注册定给的鼠标处理程序。这个处理程序会检查事件目标好识别 checkbox 上的点击，并通过下述辅助函数来切换布尔值。

``` javascript
function toggleBoolean(view: EditorView, pos: number) {
  let before = view.state.doc.sliceString(Math.max(0, pos - 5), pos)
  let change
  if (before == "false") {
    change = { from: pos - 5, to: pos, insert: "true" }
  } else if (before.endsWith("true")) {
    change = { from: pos - 4, to: pos, insert: "false" }
  } else {
    return false
  } 
  view.dispatch({ changes: change })
  return true
}
```

给（Javascript）编辑器添加该插件后，您得到如下效果：

如果想要看下行装饰器，可以查阅[斑马条纹案例](https://codemirror.net/examples/zebra/)。

## 原子范围

在某些场景下，比方说大多数替换装饰器大于单个字符，您希望编辑操作将范围视为原子元素，在光标移动过程中跳过它们，回退时也只要一步。

[`EditorView.atomicRanges`](https://codemirror.net/docs/ref/#view.EditorView%5EatomicRanges) facet 可以提供范围集（通常相同的集合我们给装饰器使用）然后确保光标移动时跳过集合中的范围。

让我们实现一个拓展，用来替换类似[[this]]这样的占位符作为小组件，并让编辑器原子化处理它们。

[`MatchDecorator`](https://codemirror.net/docs/ref/#view.MatchDecorator) 是一个辅助类，用来快速配置视图一个插件，装饰视图中所有正则表达式匹配到的内容。

``` javascript
import { MatchDecorator } from "@codemirror/view"

const placeholderMatcher = new MatchDecorator({
  regexp: /\[\[(\w+)\]\]/g,
  decoration: match => Decoration.replace({
    widget: new PlaceholderWidget(match[1]),
  })
})
```
（PlaceholderWidget 是 [WidgetType](https://codemirror.net/docs/ref/#view.WidgetType) 的直接子类用来在样式元素中渲染给定的名称）

我们在插件中使用匹配器创建和维护装饰器。它同样也提供装饰器集作为原子范围。

``` javascript
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate
} from "@codemirror/view"

const placeholders = ViewPlugin.fromClass(
  class {
    placeholders: DecorationSet

    constructor(view: EditorView) {
      this.placeholders = placeholderMatcher.createDeco(view)
    }
    update(update: ViewUpdate) {
      this.placeholders = placeholderMatcher.updateDeco(update, this.placeholders)
    }
  },
  {
    decorations: instance => instance.placeholders,
    provide: plugin => EditorView.atomicRanges.of(view => {
      return view.plugin(plugin)?.placeholders || Decoration.none
    })
  }
)
```

如果需要，可以使用[事务过滤器](https://codemirror.net/docs/ref/#state.EditorState%5EtransactionFilter)以自定义方式实现类似的功能。

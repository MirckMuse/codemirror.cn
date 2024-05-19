# 案例：Tooltips 工具提示

`@codemirror/view` 包提供了在编辑器上显示工具提示的功能——小部件浮动在内容上，与内容中的某个位置对齐。

为了与界面其余部分的风格保持一致，工具提示不会通过副作用添加和删除到编辑器中，而是由内容 facet 的控制。这确实会使它们稍微涉及到设置，但通过将工具提示直接绑定到它们所反映的状态，我们可以避免一整类潜在的同步问题。

## 光标位置

第一个示例实现一个工具提示，用于在光标上方显示 `行:列` 位置。

动态 facet 值需要植根于某个地方 —— 通常是在状态字段中。下面的字段包含一组基于当前选择状态的工具提示。我们将只显示光标的工具提示（而不是范围选择），考虑到可能有多个光标，因此需要将工具提示保存在一个数组中。

``` typescript
import { Tooltip, showTooltip } from "@codemirror/view"
import { StateField } from "@codemirror/state"

const cursorTooltipField = StateField.define<readonly Tooltip[]>({
  create: getCursorTooltips,

  update(tooltips, tr) {
    if (!tr.docChanged && !tr.selection) return tooltips;

    return getCursorTooltips(tr.state)
  },

  provide: f => showTooltip.computeN([f], state => state.field(f))
})
```


与[computeN](https://codemirror.net/docs/ref/#state.Facet.computeN)一起使用的[provide](https://codemirror.net/docs/ref/#state.StateField%5Edefine%5Econfig.provide)选项，是从状态字段提供多个 facet 输入的方法。

通常，管理工具提示的字段会稍微不那么琐碎。例如，自动补全扩展从一个字段中跟踪激活的补全状态，并从中提供零到一个工具提示（补全小部件）。

该状态字段使用的辅助函数如下所示：

``` typescript
import { EditorState } from "@codemirror/state"

function getCursorTooltips(state: EditorState): readonly Tooltip[] {
  return state.selection.ranges
    .filter(range => range.empty)
    .map(range => {
      let line = state.doc.lineAt(range.head)
      let text = line.number + ":" + (range.head - line.from)
      return {
        pos: range.head,
        above: true,
        strictSide: true,
        arrow: true,
        create: () => {
          let dom = document.createElement("div")
          dom.className = "cm-tooltip-cursor"
          dom.textContent = text
          return { dom }
        }
      }
    })
}
```

函数返回表示工具提示数组对象，对象提供工具提示相对于当前位置的方向（我们希望即使可视窗口没有足够的空间，工具提示也能在光标上方显示），是否显示三角箭头以及绘制的函数。

`create` 函数处理 DOM 相关以及和工具提示相关的部分。函数的返回值还可以定义一个函数在添加工具提示到 DOM 中或者视图状态更新时调用。

激活的工具提示是一个固定位置元素。我们添加一些外边距和圆角，并将元素和箭头的背景都设置为紫色。`:after` 元素为箭头生成了一个伪边界，我们不希望这样，所以设置它为透明。

``` javascript
import { EditorView } from "@codemirror/view"

const cursorTooltipBaseTheme = EditorView.baseTheme({
  ".cm-tooltip.cm-tooltip-cursor": {
    backgroundColor: "#66b",
    color: "white",
    border: "none",
    padding: "2px 7px",
    borderRadius: "4px",
    "& .cm-tooltip-arrow:before": {
      borderTopColor: "#66b"
    },
    "& .cm-tooltip-arrow:after": {
      borderTopColor: "transparent"
    }
  }
})
```

最后，我们定义一个函数来返回所需要的启动拓展：字段和基本主题。

``` javascript
export function cursorTooltip() {
  return [cursorTooltipField, cursorTooltipBaseTheme]
}
```

## 悬浮提示

工具提示包还导出`hoverTooltip`辅助函数，该函数可用于定义当用户悬停在文档上时显示的工具提示。下述案例将演示悬浮单词上显示的工具提示。

定义悬停工具提示时，提供一个函数，当指针停留在编辑器上时将调用该函数。它获取指针附近的位置和指针所在位置的一侧，并可以选择返回应显示的工具提示。

定义悬浮工具提示时，需要提供一个在指针停留在编辑器上时调用的函数。该函数会获取指针附近的位置和指针所在位置的方向，并返回应该显示的工具提示。

``` javascript
import { hoverTooltip } from "@codemirror/view"

export const wordHover = hoverTooltip((view, pos, side) => {
  let { from, to, text } = view.state.doc.lineAt(pos);

  let start = pos, end = pos;

  while (start > from && /\w/.test(text[start - from - 1])) start--

  while (end < to && /\w/.test(text[end - from])) end++

  if (start == pos && side < 0 || end == pos && side > 0) return null;

  return {
    pos: start,
    end,
    above: true,
    create(view) {
      let dom = document.createElement("div")
      dom.textContent = text.slice(start - from, end - from)
      return { dom }
    }
  }
})
```

上述函数只是粗略的判断给定位置的单词边界，如果指针位于单词内部，返回带有该单词的工具提示。`end` 字段用于判断在不关闭工具提示的情况下移动的范围。当工具提示包含用户可以交互的控件时，这可能很有用——当指针朝向这些控件移动时，工具提示不应关闭。

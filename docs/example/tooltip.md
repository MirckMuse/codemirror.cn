# 案例：Tooltips

`@codemirror/view` 包提供了在编辑器上显示工具提示的功能——小部件浮动在内容上，与内容中的某个位置对齐。

The @codemirror/view package provides functionality for displaying tooltips over the editor—widgets floating over the content, aligned to some position in that content.

为了与界面其余部分的风格保持一致，工具提示不会通过副作用添加和删除到编辑器中，而是由方面的内容控制。这确实会使它们稍微涉及到设置，但通过将工具提示直接绑定到它们所反映的状态，我们可以避免一整类潜在的同步问题。

In keeping with the style of the rest of the interface, tooltips are not added and removed to an editor through side effects, but instead controlled by the content of a facet. This does make them slightly involved to set up, but by directly tying the tooltips to the state they reflect we avoid a whole class of potential synchronization problems.

## 光标位置


第一个示例实现了一个工具提示，该工具提示显示光标上方的行：列位置。

This first example implements a tooltip that displays a row:column position above the cursor.

动态方面值需要植根于某个地方——通常是在状态字段中。下面的字段包含一组基于当前选择状态的工具提示。我们将只显示光标的工具提示（而不是范围选择），但可以有多个光标，因此工具提示保存在一个数组中。

Dynamic facet values need to be rooted somewhere—usually in a state field. The field below holds the set of tooltips, basing them on the current selection state. We'll only show tooltips for cursors (not range selections), but there can be multiple cursors, so the tooltips are kept in an array.

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


与computeN一起使用的provide选项是从状态字段提供多个方面输入的方法。

The provide option, used with computeN, is the way to provide multiple facet inputs from a state field.

通常，管理工具提示的字段会稍微不那么琐碎。例如，自动完成扩展跟踪字段中的活动完成状态，并从中提供零个或一个工具提示（完成小部件）。

Often the field that manages your tooltips will be a bit less trivial. For example, the autocompletion extension tracks the active completion state in a field, and provides zero or one tooltips (the completion widget) from that.

该状态字段使用的辅助函数如下所示：

The helper function used by that state field looks like this:

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
          return {dom}
        }
      }
    })
}
```

工具提示表示为提供工具提示的位置、工具提示相对于该位置的方向（即使视口中没有空间，我们也希望工具提示位于光标上方）、是否在工具提示上显示三角形箭头以及绘制该箭头的函数的对象。

Tooltips are represented as objects that provide the position of the tooltip, its orientation relative to that position (we want our tooltips above the cursor, even when there's no room in the viewport), whether to show a triangle-arrow on the tooltip, and a function that draws it.

这个create函数处理工具提示中与DOM相关的命令式部分。它的返回值还可以定义在工具提示添加到DOM或视图状态更新时应调用的函数。

This create function handles the DOM-related and imperative part of the tooltip. Its return value can also define functions that should be called when the tooltip is added to the DOM or the view state updates.

活动的工具提示显示为固定位置元素。我们添加了一些填充和边界半径，并将元素和箭头的背景都设置为紫色。：after元素为箭头生成了一个伪边界，而我们在这里不希望这样，所以我们使其透明。

Active tooltips are displayed as fixed-position elements. We add some padding and a border radius to ours, and set the background on both the element and the arrow to purple. The :after element produces a pseudo-border for the arrow, which we don't want here, so we make it transparent.

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

最后，我们可以定义一个函数，该函数返回启用此功能所需的扩展：字段和基本主题。

And finally we can define a function that returns the extensions needed to enable this feature: the field and the base theme.

``` javascript
export function cursorTooltip() {
  return [cursorTooltipField, cursorTooltipBaseTheme]
}
```

## 悬浮提示

工具提示包还导出辅助函数hoverTooltip，该函数可用于定义当用户悬停在文档上时显示的工具提示。此演示将显示带有悬停在其上的单词的工具提示。

The tooltip package also exports a helper function hoverTooltip, which can be used to define tooltips that show up when the user hovers over the document. This demo will show tooltips with the word you're hovering over.

定义悬停工具提示时，提供一个函数，当指针停留在编辑器上时将调用该函数。它获取指针附近的位置和指针所在位置的一侧，并可以选择返回应显示的工具提示。

When defining a hover tooltip, you provide a function that will be called when the pointer pauses over the editor. It gets the position near the pointer and the side of that position the pointer is on, and can optionally return a tooltip that should be displayed.

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
      return {dom}
    }
  }
})
```

该函数粗略地确定给定位置周围的单词边界，如果指针位于该单词内部，则返回带有该单词的工具提示。结束字段用于确定指针可以在不关闭工具提示的情况下移动的范围。当工具提示包含用户可以与之交互的控件时，这可能很有用——当指针移向这些控件时，工具提示不应关闭。

The function crudely determines the word boundaries around the given position and, if the pointer is inside that word, returns a tooltip with the word. The end field is used to determine the range that the pointer can move over without closing the tooltip. This can be useful when the tooltip contains controls that the user can interact with—the tooltip shouldn't close when the pointer is moving towards such controls.

# 案例：Tooltips

The @codemirror/view package provides functionality for displaying tooltips over the editor—widgets floating over the content, aligned to some position in that content.

In keeping with the style of the rest of the interface, tooltips are not added and removed to an editor through side effects, but instead controlled by the content of a facet. This does make them slightly involved to set up, but by directly tying the tooltips to the state they reflect we avoid a whole class of potential synchronization problems.

## 光标位置

This first example implements a tooltip that displays a row:column position above the cursor.

Dynamic facet values need to be rooted somewhere—usually in a state field. The field below holds the set of tooltips, basing them on the current selection state. We'll only show tooltips for cursors (not range selections), but there can be multiple cursors, so the tooltips are kept in an array.

``` javascript
import {Tooltip, showTooltip} from "@codemirror/view"
import {StateField} from "@codemirror/state"

const cursorTooltipField = StateField.define<readonly Tooltip[]>({
  create: getCursorTooltips,

  update(tooltips, tr) {
    if (!tr.docChanged && !tr.selection) return tooltips
    return getCursorTooltips(tr.state)
  },

  provide: f => showTooltip.computeN([f], state => state.field(f))
})
```

The provide option, used with computeN, is the way to provide multiple facet inputs from a state field.

Often the field that manages your tooltips will be a bit less trivial. For example, the autocompletion extension tracks the active completion state in a field, and provides zero or one tooltips (the completion widget) from that.

The helper function used by that state field looks like this:

``` typescript
import {EditorState} from "@codemirror/state"

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

Tooltips are represented as objects that provide the position of the tooltip, its orientation relative to that position (we want our tooltips above the cursor, even when there's no room in the viewport), whether to show a triangle-arrow on the tooltip, and a function that draws it.

This create function handles the DOM-related and imperative part of the tooltip. Its return value can also define functions that should be called when the tooltip is added to the DOM or the view state updates.

Active tooltips are displayed as fixed-position elements. We add some padding and a border radius to ours, and set the background on both the element and the arrow to purple. The :after element produces a pseudo-border for the arrow, which we don't want here, so we make it transparent.

``` javascript
import {EditorView} from "@codemirror/view"

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

And finally we can define a function that returns the extensions needed to enable this feature: the field and the base theme.

``` javascript
export function cursorTooltip() {
  return [cursorTooltipField, cursorTooltipBaseTheme]
}
```

## 悬浮提示

The tooltip package also exports a helper function hoverTooltip, which can be used to define tooltips that show up when the user hovers over the document. This demo will show tooltips with the word you're hovering over.

When defining a hover tooltip, you provide a function that will be called when the pointer pauses over the editor. It gets the position near the pointer and the side of that position the pointer is on, and can optionally return a tooltip that should be displayed.

``` javascript
import {hoverTooltip} from "@codemirror/view"

export const wordHover = hoverTooltip((view, pos, side) => {
  let {from, to, text} = view.state.doc.lineAt(pos)
  let start = pos, end = pos
  while (start > from && /\w/.test(text[start - from - 1])) start--
  while (end < to && /\w/.test(text[end - from])) end++
  if (start == pos && side < 0 || end == pos && side > 0)
    return null
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

The function crudely determines the word boundaries around the given position and, if the pointer is inside that word, returns a tooltip with the word. The end field is used to determine the range that the pointer can move over without closing the tooltip. This can be useful when the tooltip contains controls that the user can interact with—the tooltip shouldn't close when the pointer is moving towards such controls.

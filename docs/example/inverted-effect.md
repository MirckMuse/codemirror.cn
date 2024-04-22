# 案例：可撤销效果

默认情况下，[历史](https://codemirror.net/docs/ref/#commands.history)拓展只追踪文档和选中状态的变更，撤销也只会回滚这些内容，除此之外的编辑器状态则不会关注。

有时候，您可能需要编辑器状态中的其他动作也可以被撤销。如果您将这些动作建模成[状态效果](https://codemirror.net/docs/ref/#state.StateEffect)，就可以将这些功能联系到核心历史模块中。这样做的方法是将你的效果注册为[可反转](https://codemirror.net/docs/ref/#commands.invertedEffects)。当历史模块遇到这类效果的事务，会存储事务的反转状态，在事务被撤销时会用到这些状态。

让我们通过一个拓展的案例：让用户可以高亮部分文档，并撤销这些高亮。

我们在[状态字段](https://codemirror.net/docs/ref/#state.StateField)中保存这些有关高亮范围的信息，并定义新增和移除这些范围的效果。

``` typescript
import { StateEffect, ChangeDesc } from "@codemirror/state"

const addHighlight = StateEffect.define<{ from: number, to: number }>({
  map: mapRange
})
const removeHighlight = StateEffect.define<{ from: number, to: number }>({
  map: mapRange
})

function mapRange(range: { from: number, to: number }, change: ChangeDesc) {
  let from = change.mapPos(range.from), to = change.mapPos(range.to)
  return from < to ? { from, to } : undefined
}
```

这样的效果可以添加到事务中，并通过代码检查。由于效果包含文档位置，因此它们需要定义一个映射函数，以便在进行更改时（例如，在 [addToHistory](https://codemirror.net/docs/ref/#state.Transaction%5EaddToHistory) 标志设置为`false`时）进行适当调整，从而导致撤销的效果应用于与最初创建的文档不同的文档。

我们定义了一个状态字段保存装饰器的[范围集](https://codemirror.net/docs/ref/#state.RangeSet)作为高亮集。每当有高亮相关的事务使用时，字段的更新函数都会应用这些效果。

``` typescript
import { Decoration, DecorationSet } from "@codemirror/view"
import { StateField } from "@codemirror/state"

const highlight = Decoration.mark({
  attributes: { style: `background-color: rgba(255, 50, 0, 0.3)` }
})

const highlightedRanges = StateField.define({
  create() {
    return Decoration.none
  },
  update(ranges, tr) {
    ranges = ranges.map(tr.changes)
    for (let e of tr.effects) {
      if (e.is(addHighlight))
        ranges = addRange(ranges, e.value)
      else if (e.is(removeHighlight))
        ranges = cutRange(ranges, e.value)
    }
    return ranges
  },
  provide: field => EditorView.decorations.from(field)
})
```

为了确保我们的范围集不包含重叠或者不必要的碎片范围，这些辅助方法通过在添加时用单个连续范围替换接触给定范围的所有高亮显示，或在删除时仅用伸出已清除区域的旧范围片段来清除或添加范围。

``` typescript
function cutRange(ranges: DecorationSet, r: { from: number, to: number }) {
  let leftover = []
  ranges.between(r.from, r.to, (from, to, deco) => {
    if (from < r.from) leftover.push(deco.range(from, r.from))
    if (to > r.to) leftover.push(deco.range(r.to, to))
  })
  return ranges.update({
    filterFrom: r.from,
    filterTo: r.to,
    filter: () => false,
    add: leftover
  })
}

function addRange(ranges: DecorationSet, r: { from: number, to: number }) {
  ranges.between(r.from, r.to, (from, to) => {
    if (from < r.from) r = { from, to: r.to }
    if (to > r.to) r = { from: r.from, to }
  })
  return ranges.update({
    filterFrom: r.from,
    filterTo: r.to,
    filter: () => false,
    add: [highlight.range(r.from, r.to)]
  })
}
```

现在我们可以定义可撤销效果的逻辑。我们传给 [invertedEffects](https://codemirror.net/docs/ref/#commands.invertedEffects) 的函数会被每个事务调用，函数返回一个效果数组，历史应该将这些效果存储在该事务的反转旁边。

这样，该函数可以将新增高亮的效果转换成删除高亮的效果，反过来也一样。

由于删除高亮显示周围的区域也会删除高亮显示，并且我们可能希望在撤销删除时恢复它们，因此该函数还会迭代所有替换的范围，并为其中任何覆盖的高亮显示创建高亮显示效果。

``` javascript
import { invertedEffects } from "@codemirror/commands"

const invertHighlight = invertedEffects.of(tr => {
  let found = []
  for (let e of tr.effects) {
    if (e.is(addHighlight)) found.push(removeHighlight.of(e.value))
    else if (e.is(removeHighlight)) found.push(addHighlight.of(e.value))
  }
  let ranges = tr.startState.field(highlightedRanges)
  tr.changes.iterChangedRanges((chFrom, chTo) => {
    ranges.between(chFrom, chTo, (rFrom, rTo) => {
      if (rFrom >= chFrom || rTo <= chTo) {
        let from = Math.max(chFrom, rFrom), to = Math.min(chTo, rTo)
        if (from < to) found.push(addHighlight.of({ from, to }))
      }
    })
  })
  return found
})
```

这两个命令可以应用我们的效果到任意选中范围。

``` typescript
import { EditorView } from "@codemirror/view"

function highlightSelection(view: EditorView) {
  view.dispatch({
    effects: view.state.selection.ranges
      .filter(r => !r.empty)
      .map(r => addHighlight.of(r))
  })
  return true
}

function unhighlightSelection(view: EditorView) {
  let highlighted = view.state.field(highlightedRanges)
  let effects = []
  for (let sel of view.state.selection.ranges) {
    highlighted.between(sel.from, sel.to, (rFrom, rTo) => {
      let from = Math.max(sel.from, rFrom), to = Math.min(sel.to, rTo)
      if (from < to) effects.push(removeHighlight.of({ from, to }))
    })
  }
  view.dispatch({effects})
  return true
}
```

注意 `unhighlightSelection` 只会为选择区域和之前高亮范围重叠的部分创建取消高亮效果。如果我们只是简单的根据选中区域来创建效果，在反转效果的时候，可能会把之前没有选中的区域撤销成高亮。

``` typescript
import { keymap } from "@codemirror/view"

const highlightKeymap = keymap.of([
  { key: "Mod-h", run: highlightSelection },
  { key: "Shift-Mod-h", run: unhighlightSelection }
])

export function rangeHighlighting() {
  return [
    highlightedRanges,
    invertHighlight,
    highlightKeymap
  ]
}
```

最后的效果如下：

# 案例：编辑器面板

面板是一个在编辑器上方或者下方的 UI 元素，由 `@codemirror/view` 包提供的功能。对于具有固定高度的编辑器，它们将位于编辑器的垂直空间内。当编辑器部分滚动出视图时，面板将定位为保持在视图中。


本案例显示如何给您的编辑器添加面板。

## 打开和关闭面板

面板集显示的时机由 `showPanel` facet 的值决定。为了跟踪面板的当前状态，我们定义了这个状态字段，其效果是打开或关闭它。

``` typescript
import { showPanel, Panel } from "@codemirror/view"
import { StateField, StateEffect } from "@codemirror/state"

const toggleHelp = StateEffect.define<boolean>()

const helpPanelState = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (let e of tr.effects) if (e.is(toggleHelp)) value = e.value
    return value
  },
  provide: f => showPanel.from(f, on => on ? createHelpPanel : null)
})
```

`provide` 选项将状态字段与 `showPanel` facet相关联。`createHelpPanel` 函数的定义如下：

``` typescript
import { EditorView } from "@codemirror/view"

function createHelpPanel(view: EditorView) {
  let dom = document.createElement("div")
  dom.textContent = "F1: Toggle the help panel"
  dom.className = "cm-help-panel"
  return { top: true, dom }
}
```

这不是一个很有用的面板。它返回的对象除了提供面板的DOM结构外，还配置了面板应该位于编辑器的顶部还是底部。

接下来，我们定义一个按键绑定，使 `F1` 打开和关闭字段。


``` javascript
const helpKeymap = [{
  key: "F1",
  run(view) {
    view.dispatch({
      effects: toggleHelp.of(!view.state.field(helpPanelState))
    })
    return true
  }
}]
```

然后通过 `helpPanel` 函数中将所有内容整合在一起，该函数将创建扩展，从而启用字段、键绑定和面板的简单样式。

``` javascript
import { keymap } from "@codemirror/view"

const helpTheme = EditorView.baseTheme({
  ".cm-help-panel": {
    padding: "5px 10px",
    backgroundColor: "#fffa8f",
    fontFamily: "monospace"
  }
})

export function helpPanel() {
  return [helpPanelState, keymap.of(helpKeymap), helpTheme]
}
```

## 动态面板内容

通常需要使面板的内容与编辑器的其他部分保持同步。为此，面板构造函数返回的对象可能有一个更新方法，就像视图插件中的更新方法一样，每次编辑器视图更新时都会调用该方法。

我们将构建一个小的扩展，用于设置一个单词计数面板。

首先，我们需要一个函数来统计文档中的单词（比较粗糙，无法识别Unicode）。

``` typescript
import { Text } from "@codemirror/state"

function countWords(doc: Text) {
  let count = 0, iter = doc.iter()
  while (!iter.next().done) {
    let inWord = false
    for (let i = 0; i < iter.value.length; i++) {
      let word = /\w/.test(iter.value[i])
      if (word && !inWord) count++
      inWord = word
    }
  }
  return `Word count: ${count}`
}
```

然后，通过面板的构造函数构建一个面板，在每次文档更改时重新计算单词数。

``` typescript
import { EditorView, Panel } from "@codemirror/view"

function wordCountPanel(view: EditorView): Panel {
  let dom = document.createElement("div")
  dom.textContent = countWords(view.state.doc)
  return {
    dom,
    update(update) {
      if (update.docChanged)
        dom.textContent = countWords(update.state.doc)
    }
  }
}
```

最后，通过一个函数构建扩展，在编辑器中启用面板。

``` javascript
import { showPanel } from "@codemirror/view"

export function wordCounter() {
  return showPanel.of(wordCountPanel)
}
```
# 案例：分离视图

尽管可以在一个[编辑器状态](https://codemirror.net/docs/ref/#state.EditorState)上创建多个[视图](https://codemirror.net/docs/ref/#view.EditorView)，但是视图本身不会同步。编辑器状态是不可变值，如果通过不同视图更新状态很容易发生分歧。

因此，为了保证两个视图的内容同步，您得从一个视图转发变更到另一个。比较好的实现方式是重写[分发函数](https://codemirror.net/docs/ref/#view.EditorView.constructor%5Econfig.dispatch)，或者[更新监听器](https://codemirror.net/docs/ref/#view.EditorView%5EupdateListener)。在本案例中，我们使用前者。

确保只有一个视图有撤消历史纪录，我们配置一个状态包含历史纪录拓展，另外一个没有。主编辑器的状态按照正常方式来配置。

``` javascript
import { EditorState } from "@codemirror/state"
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands"
import { drawSelection, keymap, lineNumbers } from "@codemirror/view"

let startState = EditorState.create({
  doc: "The document\nis\nshared",
  extensions: [
    history(),
    drawSelection(),
    lineNumbers(),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
    ])
  ]
})
```

第二个编辑器状态不追踪历史状态，只绑定历史相关按键来执行主编辑器的 `撤消/恢复`。

``` javascript
import {undo, redo} from "@codemirror/commands"

let otherState = EditorState.create({
  doc: startState.doc,
  extensions: [
    drawSelection(),
    lineNumbers(),
    keymap.of([
      ...defaultKeymap,
      {key: "Mod-z", run: () => undo(mainView)},
      {key: "Mod-y", mac: "Mod-Shift-z", run: () => redo(mainView)}
    ])
  ]
})
```

接下来，让我们编写两个编辑器之间的响应变更广播的代码。

为了能够区别用户传递的常规事务和其他编辑器同步过来的事务，我们定义一个[注解](https://codemirror.net/docs/ref/#state.Annotation)来标记同步事务。只要有事务让文档变更，就会触发同步视图，并被另外一个编辑器调用。

``` typescript
import { EditorView } from "@codemirror/view"
import { Transaction, Annotation } from "@codemirror/state"

let syncAnnotation = Annotation.define<boolean>()

function syncDispatch(tr: Transaction, view: EditorView, other: EditorView) {
  view.update([tr])
  if (!tr.changes.empty && !tr.annotation(syncAnnotation)) {
    let annotations: Annotation<any>[] = [syncAnnotation.of(true)]
    let userEvent = tr.annotation(Transaction.userEvent)
    if (userEvent) annotations.push(Transaction.userEvent.of(userEvent))
    other.dispatch({ changes: tr.changes, annotations })
  }
}
```

现在让我们创建两个视图，看看有什效果。

``` javascript
let mainView = new EditorView({
  state: startState,
  parent: document.querySelector("#editor1"),
  dispatch: tr => syncDispatch(tr, mainView, otherView)
})

let otherView = new EditorView({
  state: otherState,
  parent: document.querySelector("#editor2"),
  dispatch: tr => syncDispatch(tr, otherView, mainView)
})
```

注意：编辑器之间不同享非文档状态（比如选择状态）。对于大多数这样的状态，都不合适共享。但在某些情况下，可能需要共享其他元素（例如断点信息）。您必须设置同步代码，以便在文档更改的同时将更新转发到共享状态（也可能是[效果](https://codemirror.net/docs/ref/#state.StateEffect)）。

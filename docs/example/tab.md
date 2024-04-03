# 案例：`Tab` 处理

默认情况下，CodeMirror 不处理 Tab 按键。这不是疏忽，根据 W3C《网页内容无障碍指南》中[无键盘陷阱](https://www.w3.org/TR/WCAG21/#no-keyboard-trap)，刻意设计成这样。

一些用户浏览网页不喜欢使用点击设备，添加 Tab 对于这类用户很不友好，因为一旦聚焦输入框后便无法在退出输入框。

当然，我理解朋友们期待在代码编辑器中可以用`Tab` 键控制缩进相关的事情。想要实现这个目标，CodeMirror 设置一个逃脱出口：如果你按 `Escape` + `Tab` 键，编辑器则不会处理 `Tab`，以便于你可以移动聚焦到下一个元素。不幸的是，因为 CodeMirror 没有设置帮助功能（可能也不应该知道，毕竟CodeMirror只是一个组件，不是一个应用程序），用户不会知道这一点。

所以如果真的想要绑定 `Tab` 键，请在您的文档开始的地方确保提示了用户这个逃脱出口。下面，你可以给 `Tab` 绑定一些指令了，或者直接使用 [commands](https://codemirror.net/docs/ref/#commands) 包中的 [indentWithTab](https://codemirror.net/docs/ref/#commands.indentWithTab)。 

``` javascript
import { basicSetup } from "codemirror"
import { EditorView, keymap } from "@codemirror/view"
import { indentWithTab } from "@codemirror/commands"
import { javascript } from "@codemirror/lang-javascript"

const doc = `if (true) {
  console.log("okay")
} else {
  console.log("oh no")
}
`

new EditorView({
  doc,
  extensions: [
    basicSetup,
    keymap.of([indentWithTab]),
    javascript()
  ],
  parent: document.querySelector("#editor")
})
```

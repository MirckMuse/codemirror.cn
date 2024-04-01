# 案例：样式

CodeMirror 使用 CSS-in-JS 系统好让样式可以直接放入脚本文件中。这意味着编辑器运行时，可以不用包含一整个库的 CSS 文件在页面中，对于编辑器视图和其他定义依赖定义的样式都会通过 JavaScript 模块系统拉取。

主题是非常简单的拓展，用来告诉编辑器在外部 DOM 元素上挂载一个额外的样式模块和新增类名（生成的）来开启样式。

## 传统 CSS

编辑器重要的元素使用传统 CSS 类名（非生成的），可以用作手动编写样式表的。例如，外部元素有 `cm-editor` 类。

然而，由库注入的 CSS 规则会有一个额外生成的类名作为前缀，以便于在指定开启时应用。如果你需要重载这些样式，得特别注意自定义规则至少需要和注入的规则一致，比如例子中的 `.cm-editor` 前缀。它们需要具体一些，但又不能太具体，注入的规则的样式比外部样式表靠前，优先级低于自定义的样式规则。

``` css
.cm-editor.cm-focused { outline: 2px solid cyan }
.cm-editor .cm-content { font-family: "Consolas" }
```

注意`cm-focused` 规则需要直接应用在有`cm-ediotor`类的元素上，所以两个选择器之间不能有空格，鉴于`cm-content`规则需要应用在编辑类的节点上，所以需要添加一个空格。

## 哪些规则可以添加样式

编译器（开启 gutter 和 drawSelection 后）的 DOM 结构大概长这样：

``` HTML
<div class="cm-editor [cm-focused] [generated classes]">
  <div class="cm-scroller">
    <div class="cm-gutters">
      <div class="cm-gutter [...]">
        <!-- One gutter element for each line -->
        <div class="cm-gutterElement">...</div>
      </div>
    </div>

    <div class="cm-content" contenteditable="true">
      <!-- The actual document content -->
      <div class="cm-line">Content goes here</div>
      <div class="cm-line">...</div>
    </div>

    <div class="cm-selectionLayer">
      <!-- Positioned rectangles to draw the selection -->
      <div class="cm-selectionBackground"></div>
    </div>
    
    <div class="cm-cursorLayer">
      <!-- Positioned elements to draw cursors -->
      <div class="cm-cursor"></div>
    </div>
  </div>
</div>
```

给编辑器添加样式有一些限制。设置编辑器行`display: inline` 或者设置游标`position: fixed` 会破坏一些编辑器的功能。但只要在合理的边界内修改样式，库会尽可能保持功能稳定。

+ 可以给文本内容添加不同字体、字号和颜色等等样式。但不能添加monospace字体，或者固定行高。
+ 如果想给文档设置外部 padding，你可以给`cm-content`设置垂直 padding，给`cm-line`设置水平 padding。
+ 默认情况系啊，编辑器会根据内容调整高度，但你可以设置`cm-scroller`的`overflow: auto`，并给`cm-editor`分配一个 height 或者 max-height, 好让编辑器滚动。
+ 颜色可以随意调整，但给内容添加背景颜色的时候，建议添加一个透明度。不然可能会导致其他一些样式看不见（包括 selection）。
+ 编辑器的空白行欣慰可以被设置为 `pre` 或者 `pre-wrap` 控制换行（换行拓展简单设置为 `pre-wrap`）。
+ 编辑器的文本方向依据 content DOM 的方向。
+ 库支持通过 CSS transform 控制 2D 的缩放和平移。但是其他（旋转、3D transformation，切断）则会破坏编辑器。

## 主题

主题通过 `EditorView.theme` 定义。这个函数通过接收 CSS 选择器和样式值对象，返回一个用来安装主题的拓展。

``` javascript
import { EditorView } from "@codemirror/view"

let myTheme = EditorView.theme({
  "&": {
    color: "white",
    backgroundColor: "#034"
  },
  ".cm-content": {
    caretColor: "#0e9"
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#0e9"
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "#074"
  },
  ".cm-gutters": {
    backgroundColor: "#045",
    color: "#ddd",
    border: "none"
  }
}, {dark: true})
```

这段代码表示什么意思呢。首先，一些规则包含`&`占位符。这表示规则用在外部编辑器元素。默认情况下，生成的类名会有前缀和一个空格（比如 `.cm-content` 变成 `.gen001 .cm-content`）。但是外部元素的规则

TODO: 

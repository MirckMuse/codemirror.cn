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

这段代码表示什么意思呢。首先，一些规则包含`&`占位符。这表示规则用在外部编辑器元素。默认情况下，生成的类名会有前缀和一个空格（比如 `.cm-content` 变成 `.gen001 .cm-content`）。但在直接针对外部元素（获取生成的类）的规则中，这是不起作用的，您必须放置一个&字符来指示在哪里插入类选择器。

其次，因为在CodeMirror中有两种显示选择的方式（原生选择和[drawSelection](https://codemirror.net/docs/ref/#view.drawSelection)扩展），主题通常希望同时设置样式——插入符号颜色和`::`选择规则适用于原生选择，而`.cm-cursor`和`.cm-selectionBackground`规则则设置库绘制选择的样式。

最后，由于这是一个深色主题，它传递了一个`dark:true`选项，因此编辑器将为未明确设置主题样式的内容启用其深色默认样式。

一个真正的主题会想要设计更多的东西，包括由扩展创建的元素（如[面板](https://codemirror.net/docs/ref/#h_panels)和[提示](https://codemirror.net/docs/ref/#h_tooltips)）。您通常还希望在主题中包含[高亮](https://codemirror.net/docs/ref/#language.HighlightStyle)样式。例如，您可以看到[One Dark](https://github.com/codemirror/theme-one-dark)主题，并可能复制和修改它以创建自己的主题。

## 基础主题

当您创建一个扩展，需要将一些新的DOM结构添加到编辑器中，通常需要包括一个为元素提供默认样式的基本主题。基本主题的行为很像常规主题，只是它们的优先级较低，并且可以为深色和浅色主题提供单独的规则。


例如，假设有个拓展，想要把一个用蓝色圆圈替换所有字母o:

``` javascript
import { EditorView } from "@codemirror/view"

let baseTheme = EditorView.baseTheme({
  ".cm-o-replacement": {
    display: "inline-block",
    width: ".5em",
    height: ".5em",
    borderRadius: ".25em"
  },
  "&light .cm-o-replacement": {
    backgroundColor: "#04c"
  },
  "&dark .cm-o-replacement": {
    backgroundColor: "#5bf"
  }
})
```

`&dark`和`&light`占位符的作用很像`&`，只是它们扩展到一个只有当编辑器的主题是浅色或深色时才启用的类。在这种情况下，基本主题在深色主题中为其圆圈提供更亮的颜色（假设背景会更暗）。

`baseTheme`返回的扩展必须添加到编辑器配置中才能（可靠地）生效 —— 样式规则只有在创建使用它们的编辑器时才会安装在DOM中。它通常与其他相关扩展捆绑在一个数组中，并从为该功能生成扩展的导出函数返回（例如，请参见斑马线示例）。

## 高亮

代码高亮显示使用的系统与编辑器范围内的主题化略有不同。代码样式也使用JavaScript创建，并通过编辑器扩展启用。但默认情况下，它们不使用稳定的、未生成的类名。高亮显示样式直接返回语法标记的类名。

高亮显示将高亮显示标记与样式相关联。例如，这个为关键字和注释指定样式。

``` javascript
import { tags } from "@lezer/highlight"
import { HighlightStyle } from "@codemirror/language"

const myHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#fc6" },
  { tag: tags.comment, color: "#f5d", fontStyle: "italic" }
])
```

给`HighlightStyle.define`的每个对象都会提到一个标记（由语言包分配给标记），否则会像主题中的对象一样包含样式属性。

定义编辑器主题时，通常需要同时提供主题扩展和与之匹配的高亮显示样式。在syntaxHighlighting中包裹高亮显示样式（或其他高亮显示样式）以创建启用它的扩展。

``` javascript
import { syntaxHighlighting } from "@codemirror/language"

// In your extensions...
syntaxHighlighting(myHighlightStyle)

```

如果您需要使用普通的旧CSS为标记设置样式，您可以使用类HighlightStyle，它只需向标记添加一个静态类（例如cmt关键字），而无需实际为该类定义任何规则。

## 溢出和滚动

在没有任何自定义样式的情况下，CodeMirror编辑器可以垂直增长，滚动（而不是包裹）长行，并且在聚焦时除了焦环之外没有任何边框。

若要启用换行，请将EditorView.lineWrapping扩展添加到您的配置中。也可以通过其他方式调整内容元素的空白样式，但库只支持预包装和预包装，如果不同时设置溢出包装：任意位置，则包装可能不可靠，因此建议仅使用此扩展来启用包装。

通过给编辑器的外部元素一个高度，并在滚动器元素上设置overflow：auto，可以调整编辑器的垂直行为。

``` javascript
const fixedHeightEditor = EditorView.theme({
  "&": { height: "300px" },
  ".cm-scroller": { overflow: "auto" }
})
```

要让编辑器增长到最大高度，并从该点开始滚动，请在上面的设置中使用最大高度而不是高度。

由于一些模糊的CSS限制，给编辑器一个最小高度需要更多的考虑——你必须将这个高度分配给内容和槽，而不是包装器元素，以确保它们占据编辑器的整个高度。

``` javascript
const minHeightEditor = EditorView.theme({
  ".cm-content, .cm-gutter": { minHeight: "200px" }
})
```
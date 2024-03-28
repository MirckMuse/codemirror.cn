# 系统指南

这是关于 CodeMirror 编辑器系统的指南。会尽可能以简单的语言描述系统的功能。如果你想逐项查看接口文档，可以查看[指引手册](https://codemirror.net/docs/ref/)。

## 架构概览

因为 CodeMirror V6 的结构和传统 JavaScript 库不太一样（包括它之前的版本），建议你至少先阅读这一章节，避免因为错误的预期而浪费你的时间。

### 模块化

Codemirror 被分割成一系列的模块来安装，组合起来，才能提供一个完整功能的文本和代码编辑器。好的方面，你可以按需选择你想要的功能，如果你需要的话甚至可以自定义实现核心功能。坏的方面则是，设置一个编辑器需要你把一堆东西放在一起。

组装部分不难，但你得安装和导入你需要的部分。没有下述核心包，你很难设置一个编辑器：
+ @codemirror/state：定义表示编辑状态的数据结构和修改该状态。 
+ @codemirror/view：一个展示组件，它知道怎么向用户展示状态，并将基本编辑操作转换为状态更新。 
+ @codemirror/commands：定义大量编辑指令和指令快捷键。 

最小可用的编辑器如下：
``` javascript

import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeyMap } from "@codemirror/commands"

const startState = EditorState.create({
  doc: "Hello World",
  extensions: [
    keymap.of(defaultKeyMap)
  ]
});

const view = new EditorView({
  state: startState,
  parent: document.body
});
```

很多你想要的编辑器功能，比如行号槽或者撤消历史记录等，都被实现作为通用核心的拓展，需要直接添加配置来开启。为了方便入门，CodeMirror 引入基本编辑器所需要的大部分内容（不包括语语言包）。

``` javascript

import { EditorView, basicSetup } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"

const view = new EditorView({
  extensions: [
    basicSetup,
    parent: document.body
  ]
});
```

这个包是用 ESM 分发的。这意味如果没有一些打包器（将模块化的程序打包成一个大的 JavaScript 文件）或者模块加载器的话不太运行该库。如果你不太了解打包器，我建议你可以看看 [Rollup](https://rollupjs.org/) 和 [Webpack](https://webpack.js.org/)。

### 函数式核心、命令式壳

指导 CodeMirror 架构的一个态度就是函数式（纯）代码，比命令式代码更容易使用，它会创建新值，不会有副作用。但浏览器 DOM 很显然是命令式，集成 CodeMirror 的很多系统也是这样的。

为了解决这种矛盾，库的状态表示是严格按照函数式—— [文档](https://codemirror.net/docs/ref/#state.Text) 和 [状态](https://codemirror.net/docs/ref/#state.EditorState) 的数据结构时不可变的，并且对它们的操作也是纯函数，只是视图组件和命令结构包装成命令式结构。

这以意味着一个历史状态值可以保持不变，即使编辑器切换到新的状态。同时拥有新旧状态通常在处理状态改变时非常有用。这同样意味着直接修改一个状态值，或编写一个拓展像是附加状态字段，这在命令式中是无法做到你期待的样子（并可能会破坏一些事情）。

库的 TypeScript 接口视图标记数组和对象属性为只读来明确表明状态不可变。在使用JavaScript时，你很难记住这一点。但是作为一般规则，除了明确描述的文档，库创建的对象是不支持重新分配属性的。

``` javascript

let state = EditorState.create({ doc: "123" });

// 这是个不好的例子，不要这么做：
state.doc = Text.of("abc")
```

### 状态和更新

CodeMirror 库处理更新的方式受到 Redux 和 Elm 的启发。除少数例外（像是构图和拖拽处理），view 的状态完全由 state 属性中的 EditorState 的值确定的。
修改状态通常使用函数式编程，通过创建一个描述文档改变的事务，选中状态或者其他状态字段。事务可以被分发（dispatched），用于告诉视图更新它的状态，同时，它指向的 DOM 的表现与新的状态同步。

``` javascript

// 假设现在的编辑器实例文档是 "123"
let transaction = view.state.update({ changes: { from: 0, insert: "0" }})

console.log(transaction.state.doc.toString()) // "0123"
// 此时，视图任然显示旧的状态

view.dispatch(transaction);
// 现在，视图会更新成新的状态
```

典型的用户交互中的数据流看起像是这样：

![数据流](/data_flow.png)

视图监听事件。当 DOM 事件发生时，（绑定到按键的命令、注册到拓展的事件处理器）转成它们位状态事务并分发它们。这个过程会创建一个新的状态。新的状态后反馈并更新视图。

### 拓展

CodeMirror 的核心库是非常简单和通用的，大多数功能都是通过系统的拓展实现的。拓展可以做到各种各样的事情，可以仅仅通过配置一些选项，就可以定义新的状态对象字段，设置编辑器的样式，注入自定义命令组件到视图中。本系统格外关注在没有冲突的情况下组合拓展。

一系列激活的拓展会保持在编辑器状态中（可以由事务变更）。拓展作为一个值提供（通常从一些包中导出），或是一个数组。它们可以被任意嵌套（一个数组包含更多数组也是合法的拓展），然后在配置过程时消除重复。因此，拓展中放入另外一个拓展也是可以的——如果某一个拓展导入多次时，它只会生效一次。

一些情况下，拓展的优先级首先由已经明确设定优先级的类别，在这范围内，拓展的优先级由在状态中的拓展集合位置决定的。

``` javascript

import { keymap } from "@codemirror/view";
import { EditorState, Prec } from "@codemirror/state";

function dummKeymap(){
  return keymap.of([
    {
      key: "Ctrl-Space",
      run() {
        console.log(tag);
        return true
      }
    }
  ])
}

let state = EditorState.create({ extensions: [
  dummyKeymap("A"),
  dummyKeymap("B"),
  Prec.high(dummyKeymap("C"))
]})
```

上述代码，按 `Ctrl-Space` 会打印 "C"。尽管该按键在拓展的顺序排在最后，但它的优先级最高。

后续章节会更详细的描述各种拓展以及怎么使用它们。

### 文档偏移

CodeMirror 使用纯数字描述文档中的位置。这些数字表示字符数--更准确地说，它们计算 UTF16 编码单位（因此*字符算作两个单位）。换行符总算作一个单位（即使你配置换行符位为更长字符）。

这些偏移量通常跟踪选中状态，位置变更，装饰内容等等。

有时候，需要找出起始文档某个位置的内容变更后，在文档中最终位置。为了做到这一点，库提供位置映射功能，给定一个事务（或者一个变更聚）或者一个起始位置，就可以给你变更后的新位置。

``` javascript

import { EditorState } from "@codemirror/state";

let state = EditorState.create({ doc: "1234" })
// 删除“23” 并插入 "0" 在一开始的位置。
let tr = state.update({ changes: [
  { from: 1, to: 3 },
  { from: 0, insert: "" }
]})

// 旧文档的末尾位置在新文档中位3
console.log(tr.changes.mapPost(4))
```

文档的数据结构根据行索引的，因此，按行（1 为基础）查询的代价并不大。

``` javascript

import { Text } from "@codemirror/state";

let doc = Text.of(["line 1", "line 2", "line 3"]);

// 获取第 2 行的信息
console.log(doc.line(2)); // { start: 8, end: 13, ... }

// 获取位置 15 对应的行
console.log(doc.lineAt(15)) // {start: 14, end: 20, ... }
```

## 数据模型

CodeMirror 作为一个文本编辑器，将文档看做扁平字符串。它存储在树形状的数据结构中，以便于低成本的更新文档中的任何地方（以及高效索引行号）

### 文档变更

文档的更改本身就是值，准确描述了旧文档的哪些范围由新文本取代。这就方便拓展更准确的跟踪文档的变更情况，也就可以做到像是撤消历史记录以及协同编辑可以在核心库外部实现。

创建一个变更集时，所有的变更都基于原始文档进行描述——基于这一点，所有的变更是同时发生的。（如果你真的需要基于最新文档组合一些变更而不是最初的文档，你可以使用变更集的组合方法）

### 选中状态

与文档一样，一个编辑器状态存储当前的选中状态。选中状态也许包括多个范围，每一个都可以是一个游标（空格符）或者锚点和头部之间的覆盖范围。重叠的范围会被自动合并，并且该范围被排序过，因此，一个选中状态的属性总是包含一个排序信息、没有重叠的数组范围。

``` javascript

import { EditorState, EditorSelection } from "@codemirror/state";

let state = Editor.create({
  doc: "hello",
  selection: EditorSelection.create([
    EditorSelection.range(0, 4),
    EditorSelection.cursor(5)
  ]),
  extensions: EditorState.allowMultipSelection.of(true)
})

console.log(state.selection.ranges.length) // 2

let tr = state.update(state.replaceSelection("!"));

console.log(tr.state.doc.toString()) // "!0!
```
其中一个范围被标记为主要选中状态。这是一个可以从浏览器 DOM 选中状态反应出来。其的则完全由库来绘制和处理。

编辑器默认值接受单个选中范围。想要多行选中状态功能，你需要增加一个 `drawSelection` 拓展来绘制它们，并设置参数来开启。

状态对象有一个很便利的方法， changeByRange 可以将一个操作分别应用到每一个选中范围（手动操作每一个选中范围可能有点麻烦）。

``` javascript

import { EditorState, EditorSelection } from "@codemirror/state"

let state = EditorState.create({ 
  doc: "abcd",
  selection: { archor:1, head: 3 }
});

// 大写选中的字符
let tr = state.update(state.changeByRange(range => {
  let upper = state.sliceDoc(range.from, range.to).toUpperCase();

  return {
    changes: { from: range.from, to: range.to, insert: upper },
    range: EditorSelection.range(range.from, range.from + upper.length)
  }
}));

console.log(tr.state.doc.toString()) // "aBCd"
```

### 配置

每个编辑器状态都有一个对自己的配置（私有的）引用，由激活的拓展确定。每个常规事务的配置都维持一致。但也有可能会使用 compartments 或 添加到或替换当前配置的effects来重新配置状态。

直接影响状态配置的是它存储的字段以及与该状态相关的 Facets 的值。

### Facets
一个 facet 是一个拓展点。不同拓展值可以提供值给 facet。并且每个接入状态的facet 可以读取它的输出值。根据切面的不同，它可能仅提供一个值数组，也可能计算出这些值中的某个结果。

Facet 背后的理念是，大多数类型的扩展允许多个输入，并且需要计算一些连贯总和的值。这种组合方式可能存在差异。
+ 例如：tab size，你需要单个输出值。以便于 facet 接收最高优先级的值来使用。
+ 提供事件处理程序时，你可能需要处理程序是一个数组，依据优先级排序，以便于你可以一次一个尝试直到其中一个处理事件。
+ 另一个通用模式是计算输入值逻辑或（如： allowMultipleSelections）或者以某种方式减少它们（比如：接收撤消历史记录的最大请求输）。

``` javascript

import { EditorState } from "@codemirror/state";

let state = EditorState.create({
  extensions: [
    EditorState.tabSize.of(16),
    EditorState.changeFilter.of(() => true)
  ]
});

console.log(state.facet(EditorState.tabSize)); // output: 16
console.log(state.facet(EditorState.changeFilter)); // [()=> true]
```

Facets 被明确定义，返回一个 facet 值。这种值可以被导出，允许其他代码提供和读取，或者它也可以保持模块内私有，这种情况只有模块内可以访问它。我们可以在编写拓展章节中讨论这一点。

在给定的配置，大多数 facet 都是静态的，作为配置的一部分直接提供。但也可能有从其他方便的状态计算facet的值。

Facet 的值只在有必要的时候重新计算，所以你可以简单的使用一个对象或者数组来检查facet是否改变。

### 事务

事务，由状态的 update 方法创建，结合多种效果（比如）：

+ 应用到 文档变更
+ 可以准确移动选中内容。注意：当文档改变是，但没有明确新的选中内容，旧的选中内容会被隐式映射到这些变更。
+ 可以设置一个标志位命令视图中的（主要）选中内容滚动到可视范围。
+ 可以有很多注解，存储额外的元数据用于描述（完整的）事务。例如：userEvent 注释可以识别常用操作生成的事务（如：输入或者粘贴）。
+ 也会有一些独立的附加效果，通常是针对对某些拓展的状态（如：折叠代码或者开启自动补全）。
+ 它可以通过提供一个全新的拓展集或者替换指定部分的配置来影响编辑器状态的配置。

想要完全重置一个状态（如：加载一个新的文档），建议创建一个新的状态而不是用事务。这可以确保不会出现意料外的状态（比方说撤消历史记录事件）。

## 视图

我们尽可能将视图设计成围绕着状态的一个透明层。不幸的是，编辑器使用过程中的一些方面并不能单纯依靠状态中的数据来处理。
+ 在处理屏幕坐标（明确用户点击的位置、找到给定位置的坐标），可需要接入一个布局，像是浏览器的 DOM。
+ 编辑器可以设置部分文档的文字方向（用自己的 CSS 样式来覆盖）。
+ 光标移动可能依赖布局和文字方向。因此，视图提供一系列辅助方法来计算不同种类的移动。
+ 一些状态，例如聚焦和滚动位置，不是存储在函数式状态中，而是保存在 DOM 中。

库本身并不建议用户用代码扰乱 DOM 结构的管理。如果你真的这么做了，你会发现库会立刻恢复你的变更。影响内容展示的方式可以查看这一章节。

### 可视窗口
很抱歉得告诉你一件事，CodeMirror 在文档非常大的时候并不会完整的渲染它。为了避免不必要的工作，它只会在更新、查看当前可视部分的内容（没有滚动出视图的部分），再加上周边的空白。这被称作可视窗口（Viewport）。

你无法查询可视窗口位置外的坐标（因为他们没有被渲染，也没有被布局）。视图不会跟踪完整文档的高度信息（初步估计，然后在绘制内容时精确测量），对可视窗口外的部分也是一样的。

长文本（不换行）或者没有折叠的代码块还是会让可视窗口变大。当然，编辑器也会提供一系列的可视范围，不包括不可见内容。这在一些场景查非常有用，比如：折叠后的高亮代码。

### 循环更新

CodeMirror 的视图尽可能避免大量的 DOM 重排。执行事务一般仅仅由于编辑器写入 DOM，而不是入去布局信息。阅读行为（检查可视窗口是否合法，光标是否需要被滚动到视图中等）会在独立的测量阶段完成，有计划的使用 `requestAnimationFrame`。必要情况下，这个阶段会紧跟着另外的写入阶段。

你可以使用 `requestMeasure` 方法编排独立的测绘代码。

为了避免怪异的再入性情况，视图会在一个新的更新被初始化时另个一更新同一时间（同步）被应用的情况下，抛出一个错误。多个更新应用在测量阶段的等待阶段不是个问题——这是因为他们会在测量阶段被合并掉。

当一个视图实例用完后，你必须调用它的 destroy 方法去销毁，释放所有它分配到的资源（全局事件和变化监听器）。

### DOM 结构

编辑器的 DOM 结构看起会是这样：

``` html
<div class="cm-editor [theme scope classes]">
  <div class="cm-scroller">
    <div class="cm-content" contenteditable="true">
      <div class="cm-line">Content goes here</div>
      <div class="cm-line">...</div>
    </div>
  </div>
</div>
```
外部（包裹的）元素是一个垂直的 flexbox。像是 Panel 和 Tooltip 可以由拓展放到这里。

内部是滚动（scroller）元素。如果编辑器有它自己的滚动条，这个元素的样式应该设置为 `overflow: auto`。但这不是必须的——编辑器支持内容自适应，或给定 max-height超过即滚动。

这个滚动元素是个水平 flexbox 元素。在有槽的情况下，会被放在一开始的位置。 `content` 元素内部是可编辑的。它注册了一个 mutation observer，任何变化都回反馈到编辑器解析成文档变更并重新绘制受影响的节点。`content` 容器包含视图中每行文本的 `line` 元素，循环存储文档文本（可能会有样式或者小组件）。

### 样式和主题

为了管理编辑器关联样式，CodeMirror 使用一个系统来由 JavaScript 注入样式。样式可以被注册成为一个 facet，然后由视图确定是否可用。

编辑器的大多数元素都会分配 `cm-` 前缀的伪类。这些是可以直接使用你本地 CSS 样式修改的。当然也可以由主题来修改。一个主题拓展由 EditorView.theme 创建。它有自己独立的（生成的） CSS 伪类（在拓展激活的时候添加到编辑器上）和定义的局部伪类。

一个主题声明使用 sytle-mod 符号定义了大量 CSS 规则。

下述代码创建一个简单的主题让编辑器默认的文本原色变成橘色：

``` javascript
import { EditorView } from "@codemirror/view";

let view = new EditorView({
  extensions: EditorView.theme({
    ".cm-content": {color: "darkorange"},
    "&.cm-focused .cm-content": {color: "orange"}
  })
})
```

为了允许自动生成的伪类前缀被正确完成，第一个元素的规则得是编辑器的包裹元素（这就是主题独立伪类被添加地方），例如范例中的 `.cm-focused` 规则，一定使用 `&` 字符表示这个位置是个包裹元素。

拓展可以定义 基础样式 给创建的元素提供默认样式。基础样式可以使用 `&light` (默认)和 `&dark` (当暗黑主题激活时开启)占位，以便于他们不会被一个主题覆盖，他们看起来不会太违和。

``` javascript
import { EditorView } from "@codemirror/view"

// 这同样会生成一个拓展值
let myBaseTheme = EditorView.baseTheme({
  "&dark .cm-mySelector": { background: "dimgrey" },
  "&light .cm-mySelector": { background: "ghostwhite" }
})
```

### 命令

命令 是个特殊标识的函数。它们主要用作按键绑定，但他们也可以被用来做菜单项或者命令模式这类事情。一个命令函数表示一个行为。它接受一个视图并返回一个布尔值，`false` 表示没有应用到当前状态，`true`表示成功执行。命令的效果是强制的，通常由一个事务分发。

多个命令被当前到同一个按键时，他们按照优先级执行，知道其中一个返回 `true`。

命令只操作状态而不是完整视图，可以使用 StateCommand 类型替代。StateCommand 是 Command 的子类，只要求传入的参数包括 `state` 和 `dispatch` 两个属性。这对于测试一个命令时非常有用，不用特地创建一个视图。

## 拓展 CodeMirror

有很多不同的方式来拓展 CodeMirror，不同场景下会相对合适的方式。这一章节会介绍编写编辑器拓展时需要熟悉的各种概念。

### 状态字段

拓展常常需要在状态中存储额外信息。撤消历史记录需要存储可撤消的变化、代码折叠拓展需要跟踪需要折叠的内容等等。

基于这个目的，拓展可以定义额外的状态字段。状态字段运行在纯函数式的状态数据结构中，必须是不可变的值。

状态字段使用类似 reducer 的方式来和其他字段保持同步。每次状态更新时，都会使用字段的当前值和事务调用一个函数，这个函数总司返回字段的最新值。

``` javascript

import { EditorState, StateField } from "@codemirror/state"

let countDocChanges = StateField.define({
  create() { return 0 },
  update(value, tr) { return tr.docChanged ? value + 1 : value }
})

let state = EditorState.create({ extensions: countDocChanges })
state = state.update({ changes: { from: 0, insert: "." } }).state
console.log(state.field(countDocChanges)) // 输出：1
```

你可能会想用注解或者效果来表示状态字段的变化。

你可能会尝试不把状态放在实际的状态字段中——毕竟声明一个字段有点冗余，每次的状态变更都会触发完整的事务也会让人觉得很笨重。但几乎所有情况下，把您的状态与编辑器内部状态的更新周期联系起来是最好的主意了，因为这样更容易保持所有内容的同步。

### 影响视图

视图插件提供一种拓展的方式在视图内容运行一个命令式组件。通常会做一些类似于事件处理器，新增和管理 DOM 元素，或者依赖当前可视窗口的事情。

简单的查看看起来会像这样：

``` javascript
import { ViewPlugin } from "@codemirror/view"

const docSizePlugin = ViewPlugin.fromClass(class {
  constructor(view) {
    this.dom = view.dom.appendChild(document.createElement("div"))
    this.dom.style.cssText =
      "position: absolute; inset-block-start: 2px; inset-inline-end: 5px"
    this.dom.textContent = view.state.doc.length
  }

  update(update) {
    if (update.docChanged)
      this.dom.textContent = update.state.doc.length
  }

  destroy() { this.dom.remove() }
})
```

视图插件通常不应该保存（非衍生）状态。最好的方式是作为 shallow 视图遍历存在编辑器里的数据。

在状态重新配置时，视图插件不做为新配置的一部分被销毁（这也是为什么，如果他们对编辑器做了更改，就需要定义一个 destroy方法来撤消更改）。

当一个视图插件奔溃时，它会自动被禁用，以避免影响整个视图。

### 装饰文档
没有做其他事情的情况下，CodeMirror 将只能将文档作为普通文本绘制。 装饰器是拓展可以影响 CodeMirror 外观的一种机制。有以下 4 种类型：
+ Mark decorations：给指定文本增加样式或者 DOM 属性。
+ Widget decorations：给定位置在文档中插入一个 DOM 元素。
+ Replace decorations：隐藏或者用 DOM 节点替换部分文档。
+ Line decorations：给行包裹的元素增加属性。

装饰器通过 facet 提供。每次视图更新时，facet 的内容被用作调整可视内容的样式。

装饰器保存在范围集中，同样也是不可变的数据结构。这些集合可以跨更改进行映射（调整内容的位置来弥补更改）或者基于变更重建，具体取决用例。

装饰器提供 2 种方式：
+ 直接：给 facet（通常从字段中获取） 放入一个范围集值
+ 间接：用视图提供的一个函数来获取范围集。

只有直接提供装饰范围集会影响编辑器的垂直块结构，但间接使用的方式可以读取编辑器的可视窗口（具体取决于你怎么使用。例如：只想状态可视内容）。这么限制的理由是因为可视窗口是由块结构计算得来的，所以在读取可视窗口之前必须知道块结构。

### 拓展架构

要创建想要的编辑器功能，您可能需要结合不同种类的拓展：用于保存状态的状态字段、提供样式的基础主题、管理输入输出的视图插件，一些指令，获取还有帮助配置的 Facet。

常用的开发模式是导出一个返回拓展（包含需要的特性的）函数。使用函数是为了向后兼容，虽然现在还不需要接受参数，但是以后增加配置参数时，就不会有什么破坏性的改变。

由于拓展可以引入其他拓展，这种设计在你需要搞清楚自己的拓展被包含多次非常有用。对大多数拓展，例如按键映射，可以多次执行它正在执行的操作。单这往往很浪费，甚至会破坏一些东西。

通常的做法是多次使用同一个拓展，在执行时那么只需要消除相同拓展就可以了——如果你非常确定你创建的静态拓展值（主题、状态字段、视图插件等等）只会调用一次，且你的拓展构造函数一定返回同一个实例，那么你可以在编辑器中复制他们。

但是当你的拓展允许配置，你的其他逻辑可能需要用到。那么你要怎样做根据不同配置使用不同的实例呢？

有时候，这只是个错误。但大多数情况，可能会需要定义一个策略来调和他们。Facet 就很擅长做这件事情。你可以放入一个在模块中放入一个配置——私有的 facet，并用组合函数协调配置，或在调和失败时抛出异常。然后，在需要访问当前配置时可以通过代码读取 facet。

有关此方法的说明，请参见斑马线示例。




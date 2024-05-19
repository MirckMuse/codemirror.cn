---
pageClass: codemirror-ref
---

# 指引手册

CodeMirror 在 `@codemirror` 域下发布一系列 NPM 包。核心包会在在本指引手册中罗列出来。

每一个包都会暴露出 [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) 和 [CJS](https://flaviocopes.com/commonjs/) 两种模块格式。您得使用一些[打包器](https://www.freecodecamp.org/news/javascript-modules-part-2-module-bundling-5020383cf306/)或者[加载器](https://github.com/marijnh/esmoduleserve)才能让它们在浏览器中运行。

最重要的模块是：[状态](/documentation/ref.html#codemirror-state)，包含编辑器状态的数据结构模型。同样重要的还有：[视图](/documentation/ref.html#codemirror-view)，提供编辑器的 UI 组件。

最小化的编辑器配置如下：

``` javascript
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"

let myView = new EditorView({
  doc: "hello",
  extensions: [keymap.of(defaultKeymap)],
  parent: document.body
})
```

但是这样的编辑器过于原始。想要更多的功能比方说：高亮、行号槽或者撤消历史纪录，您需要给编辑器添加更多的拓展。

想要快速使用，[codemirror](/documentation/ref.html#codemirror) 包提供一系列拓展来配置可用编辑器。


## <span class="codemirror-scope">@codemirror/</span>state {#state}

In its most basic form, an editor's state is made up of a current document and a selection. Because there are a lot of extra pieces that an editor might need to keep in its state (such as an undo history or syntax tree), it is possible for extensions to add additional fields to the state object.

#### <span class="codemiorr-keyword">interface</span> EditorStateConfig {#state.EditorStateConfig}

创建编辑器状态需要传递的参数。

+ **doc?:** string | Text {#state.EditorStateConfig.doc}
  
  初始化文档。默认为空白文档。可以传入普通字符串或者一个 [Text](/documentation/ref#state.Text) 类的实例。Can be provided either as a plain string (which will be split into lines according to the value of the lineSeparator facet), or an instance of the Text class (which is what the state will use to represent the document).
+ **selection?:** EditorSelection ｜ \{ anchor: number, head?: number  \}
  
  The starting selection. Defaults to a cursor at the very start of the document.
+ **extensions?:** Extension

  Extension(s) to associate with this state.

#### <span class="codemiorr-keyword">class</span> EditorState {#state.EditorState}

The editor state class is a persistent (immutable) data structure. To update a state, you create a transaction, which produces a new state instance, without modifying the original object.

As such, never mutate properties of a state directly. That'll just break things.

+ doc: Text

  当前文档。
+ selection: EditorSelection
+ field\<T\>(field: StateField\<T\>) → T<br>field\<T\>(field:StateField\<T\>, require: false) → T | undefined
+ update(...specs: readonly TransactionSpec[]) → Transaction
+ replaceSelection(text: string | Text) → TransactionSpec

#### <span class="codemiorr-keyword">class</span> SelectionRange

#### <span class="codemiorr-keyword">class</span> EditorSelection

### Text

Text 类型存储一个不可变的树形文档。

#### <span class="codemiorr-keyword">class</span> Text <span class="codemiorr-keyword">implements</span> Iterable\<string\> {#state.Text}

文档的数据结构。

#### <span class="codemiorr-keyword">class</span> Line

#### <span class="codemiorr-keyword">interface</span> TextIterator <span class="codemiorr-keyword">extends</span> Iterator\<string\> <span class="codemiorr-keyword">extends</span> Iterable\<string\>

#### Column Utilities

#### Code Points and Characters

### 变更和事务

#### <span class="codemiorr-keyword">interface</span> TransactionSpec

#### <span class="codemiorr-keyword">class</span> Transaction

#### <span class="codemiorr-keyword">class</span> ChangeDesc

#### <span class="codemiorr-keyword">class</span> ChangeSet <span class="codemiorr-keyword">extends</span> ChangeDesc

#### <span class="codemiorr-keyword">class</span> Annotation\<T\>

#### <span class="codemiorr-keyword">class</span> AnnotationType\<T\>

#### <span class="codemiorr-keyword">class</span> StateEffect\<Value\>

### 扩展编辑器状态

#### <span class="codemiorr-keyword">class</span> StateField\<Value\>

#### <span class="codemiorr-keyword">class</span> Facet\<Input, Output = readonly Input[]\> <span class="codemiorr-keyword">implements</span> FacetReader\<Output\>

#### <span class="codemiorr-keyword">type</span> FacetReader\<Output\>

#### <span class="codemiorr-keyword">class</span> Compartment

### 范围集

#### <span class="codemiorr-keyword">abstract</span> <span class="codemiorr-keyword">class</span> RangeValue

#### <span class="codemiorr-keyword">class</span> Range\<T extends RangeValue\>

#### <span class="codemiorr-keyword">class</span> RangeSet\<T extends RangeValue\>

#### <span class="codemiorr-keyword">interface</span> RangeCursor\<T\>

#### <span class="codemiorr-keyword">class</span> RangeSetBuilder\<T extends RangeValue\>

#### <span class="codemiorr-keyword">interface</span> RangeComparator\<T extends RangeValue\>

#### <span class="codemiorr-keyword">interface</span> SpanIterator\<T extends RangeValue\>

### 工具类

## <span class="codemirror-scope">@codemirror/</span>view

## <span class="codemirror-scope">@codemirror/</span>language

## <span class="codemirror-scope">@codemirror/</span>commands

## <span class="codemirror-scope">@codemirror/</span>search

## <span class="codemirror-scope">@codemirror/</span>autocomplete

## <span class="codemirror-scope">@codemirror/</span>lint

## <span class="codemirror-scope">@codemirror/</span>collab

## <span class="codemirror-scope">@codemirror/</span>language-data

+ languages: LanguageDescription[]
  
  已知语言包的语言描述数组。

## codemirror


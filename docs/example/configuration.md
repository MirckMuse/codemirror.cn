# 案例：配置项

CodeMirror 编辑器的配置存活在它的[状态对象](https://codemirror.net/docs/ref/#state.EditorState)中。创建一个状态的时候，你可以[通过](https://codemirror.net/docs/ref/#state.EditorStateConfig.extensions)它设置一些要使用的拓展，这些拓展会被解析成有效的配置。

[拓展](https://codemirror.net/docs/ref/#state.Extension)可以由不同的库函数创建，这些拓展可以做到像是给 [facet](https://codemirror.net/docs/ref/#state.Facet) 添加一个输入或者安装一个[状态字段](https://codemirror.net/docs/ref/#state.StateField)等等。拓展可以被分组在数组中，通常比较实用的拓展会包含很多小拓展。可以访问该[页面](https://codemirror.net/docs/extensions/)查看核心仓库提供的拓展列表。

例如：[历史](https://codemirror.net/docs/ref/#commands.history)拓展包含一个状态字段用于记录撤销历史、控制拓展配置的 facet 以及监听 [`beforeinput`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/beforeinput_event)的视图插件。使用该拓展不需要太关心它怎么运作，只需要函数生成的拓展值放入配置中就可以安装所有必要部分。

[基础设置](basic setup)就是一个很好的例子，它包含了各种各样的拓展，借此来配置一个基础的代码编辑器。

## 优先级

优先级对于 facet 的[输入](https://codemirror.net/docs/ref/#state.Facet.of)非常重要。配置项按照指定的优先级解析它们，对于很多 facet 来说，优先级格外重要。例如[事件处理器](https://codemirror.net/docs/ref/#view.EditorView%5EdomEventHandlers)，[事务筛选器](https://codemirror.net/docs/ref/#state.EditorState%5EtransactionFilter)或者[按键绑定](https://codemirror.net/docs/ref/#view.keymap)，优先级决定它们哪一个被首先调用。设置像是[行分割](https://codemirror.net/examples/config/#state.EditorState%5ElineSeparator)或者[缩进单元](https://codemirror.net/docs/ref/#language.indentUnit)，高优先级的配置项目会获得胜利。

如果你指定一个配置像这样 `[keymap.of(A), keymap.of(B)]`，`A` 的优先级就高于 `B`。如果嵌套的更深，如下

``` javascript
[
  // ..., 
  [keymap.of(A)], 
  // ..., 
  [
    [], 
    // ..., 
    [keymap.of(B)]
  ]
]
```
扁平后，A 的优先级仍然高于 B。

我们还有一个更麻烦的问题，怎么给一个拓展的子拓展提供排序信息。可以把拓展被包裹在 [Prec](https://codemirror.net/docs/ref/#state.Prec) 的其中一个属性，配置项扁平化后，拓展的部分会按照默认序列被放进不同的桶里面。目前有 [highest](https://codemirror.net/docs/ref/#state.Prec.highest)，[high](https://codemirror.net/docs/ref/#state.Prec.high)， [default](https://codemirror.net/docs/ref/#state.Prec.default)，[low](https://codemirror.net/docs/ref/#state.Prec.low) 和 [lowest](https://codemirror.net/docs/ref/#state.Prec.lowest) 桶。

对于每个桶内部，拓展扁平化后的位置还是决定着优先级。而高优先级桶内的拓展都比低优先级桶的拓展优先级要高。比如下方例子里面的拓展 A：

``` javascript
[Prec.high(A), B, Prec.high([C, D])]
```
拓展优先级的排序会是：A > C > D > B，因为除 B 以外都获得了高优先级的配置。

通常，拓展会明确标注自己（或者部分子拓展）的优先级到特定存储桶中。例如，只适用于特定场景下的特定目按键绑定可能会给一个额外优先级，这样，他就可以在大部分按键绑定之前运行。或者说部分默认配置也许会设置低优先级，好让其他拓展之可以覆盖它。

另一方便，数组中拓展的排序，通常会通过代码将拓展提供的配置放在一起组合成完整的配置后进行，并允许更全局的控制。


## 动态配置

CodeMirror V6 的配置系统，不是在运行的时候你调用一个设置选项的方法就可以更改配置，它没有具体的定义，不像 V5 一样会有一个具体选项和值的映射。

这是一件很好的事情。拓展需要修改配置时，如果每个选项都有一个值，很难在不影响其他拓展的情况下完成修改，只能更新后用新值替换。Facet 接收多个输入后会明确定义某种方式组合它们，这在很大程度上避免这类冲突。

### 隔层

当然，对于一个编辑器来说动态配置非常有用。如果要想重新配置拓展树的部分拓展项，我们需要把这些拓展放进[隔层](https://codemirror.net/docs/ref/#state.Compartment)。事务可以通过替换单个隔层的内容来更新配置。

``` javascript
import { basicSetup, EditorView } from "codemirror"
import { EditorState, Compartment } from "@codemirror/state"
import { python } from "@codemirror/lang-python"

let language = new Compartment, tabSize = new Compartment

let state = EditorState.create({
  extensions: [
    basicSetup,
    language.of(python()),
    tabSize.of(EditorState.tabSize.of(8))
  ]
})

let view = new EditorView({
  state,
  parent: document.body
})
```

做完这些后，你可以调用事务来修改你的配置。

``` javascript
function setTabSize(view, size) {
  view.dispatch({
    effects: tabSize.reconfigure(EditorState.tabSize.of(size))
  })
}
```

### 私有隔层

上述案例演示了怎么把编辑器的主要配置分割当如隔层中。但是隔层也可能被嵌套，一些插件生成的拓展树可能会使用隔层动态开启或者禁用拓展。

如果仅仅需要动态修改已知 facet 的值，最好的方式是使用[计算facet](https://codemirror.net/docs/ref/#state.Facet.compute) 替代重配置，这种方式更高效和更容易记录（它们是派生状态的一种形式，而不是新增基本状态）。

但是，如果你想一个拓展有条件的开启另外一个拓展，最好局部声明一个隔层然后按需重配置它。

例如：下方函数返回的拓展绑定一个值来切换另外一个拓展的开启和关闭：

``` javascript
import { Extension, Compartment } from "@codemirror/state"
import { keymap, EditorView } from "@codemirror/view"

export function toggleWith(key: string, extension: Extension) {
  let myCompartment = new Compartment
  
  function toggle(view: EditorView) {
    let on = myCompartment.get(view.state) == extension
    view.dispatch({
      effects: myCompartment.reconfigure(on ? [] : extension)
    })
    return true
  }
  return [
    myCompartment.of([]),
    keymap.of([{key, run: toggle}])
  ]
}
```
然后你可以这么做：

``` javascript
toggleWith("Mod-o", EditorView.editorAttributes.of({
  style: "background: yellow"
}))

```

这类拓展的父隔层被重新配置，则该拓展和局部隔层会消失。

### 顶级重配置

有时候，你可能需要替换系统的主配置。有一种方式([StateEffect](https://codemirror.net/docs/ref/#state.StateEffect%5Ereconfigure))，可以用新的状态替换创建时提供的顶级拓展。

``` javascript
import { StateEffect } from "@codemirror/state"

export function deconfigure(view) {
  view.dispatch({
    effects: StateEffect.reconfigure.of([])
  })
}
```

提供这个函数并不是一个好主意，它多半会让编辑器变得失效，但是它演示怎么进行顶级重配置。这与仅仅创建一个新的编辑器状态略有不同，因为它将保留旧配置和新配置中存在的状态[字段](https://codemirror.net/docs/ref/#state.StateField)和隔间的内容。

还有另一种方式（[appendConfig](https://codemirror.net/docs/ref/#state.StateEffect%5EappendConfig)），让你可以新增一个拓展。这种方式的新增的拓展会被放在顶级配置项的后面，除非完整重配置，它会一直存在。

这对于按需加载拓展非常有用。例如[片段补全](https://codemirror.net/docs/ref/#autocomplete.snippet)，第一次激活时会新增状态字段，用来跟踪用户使用的片段字段。


``` javascript
function injectExtension(view, extension) {
  view.dispatch({
    effects: StateEffect.appendConfig.of(extension)
  })
}
```

## 自动检测语言

这个例子安装一个可以根据编辑内容（自动检测）动态修改[语言](https://codemirror.net/examples/lang-package/)配置的编辑器

为了能够在创建时影响事务（而不是在更改后重新配置拓展），我们使用[事务拓展器](https://codemirror.net/docs/ref/#state.EditorState%5EtransactionExtender)。每当文档内容修改时，通过拓展器做一些粗略的检查（文档是否已 < 开头），确定文档是否包含 HTML 或者 JavaScript 代码。

当检测到语言不是状态配置时的语言，事务被一个[重配置效果](https://codemirror.net/docs/ref/#state.Compartment.reconfigure)拓展，切换语言配置隔层到合适的拓展。


``` javascript
import { EditorState, Compartment } from "@codemirror/state"
import { htmlLanguage, html } from "@codemirror/lang-html"
import { language } from "@codemirror/language"
import { javascript } from "@codemirror/lang-javascript"

const languageConf = new Compartment

const autoLanguage = EditorState.transactionExtender.of(tr => {
  if (!tr.docChanged) return null
  let docIsHTML = /^\s*</.test(tr.newDoc.sliceString(0, 100))
  let stateIsHTML = tr.startState.facet(language) == htmlLanguage
  if (docIsHTML == stateIsHTML) return null
  return {
    effects: languageConf.reconfigure(docIsHTML ? html() : javascript())
  }
})
```

如果我们指定初始语言配置，得注意[包裹](https://codemirror.net/docs/ref/#state.Compartment.of)它在我们的隔层中，以便于拓展更新语言的时候，这一部分的配置被替换。

``` javascript
import { EditorView, basicSetup } from "codemirror"

new EditorView({
  doc: 'console.log("hello")',
  extensions: [
    basicSetup,
    languageConf.of(javascript()),
    autoLanguage
  ],
  parent: document.querySelector("#editor")
})
```

效果如下：

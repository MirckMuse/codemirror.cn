---
layout: home
pageClass: limited-width-page
---
# 案例：使用 Rollup 打包

CodeMirror 是作为一系列模块分发。不太能直接被浏览器加载 —— 尽管现代浏览器可以加载 EcmaScript 模块，但编写的时候，它们解决进一步依赖关系的机制仍然太原始，无法加载NPM分布式模块的集合。

（虽然说，我们仍然有方案可以通过服务端重写依赖让它工作，像是 [Snowpack](https://www.snowpack.dev/) 或者 [esmoduleserve](https://github.com/marijnh/esmoduleserve)。我完全建议在开发过程中使用这样的解决方案，因为它在更改文件时往往会引入较少的链接和延迟，但对于实际部署，您暂时需要进行经典的绑定。）


打包器是一种工具，它接受一个给定的主脚本（在某些情况下是多个脚本），并生成一个新的、通常更大的脚本。生成后的脚本包含了原脚本的所有（或部分）依赖项（及其依赖项，等等）。这些脚本往往由一整张依赖关系图组成，好让浏览器可以更容易运行JavaS，（但也可以，在上传到NPM之前，将作为一组文件编写的库包合并为一个文件。）

就打包器软件而言，我是 [Rollup](https://rollupjs.org/) 的忠实粉丝。当然还有其他非常棒、有独特优势的打包软件像是 [Webpack](https://webpack.js.org/) 和 [Parcel](https://parceljs.org/) 等等。

想要使用 Rollup 来创建一个 bundle 来加载 CodeMirror，你首先需要创建一个主脚本（比如：editor.mjs）导入 CodeMirror 库来创建一个[编辑器视图](https://codemirror.net/docs/ref/#view.EditorView);

``` javascript
import { EditorView, basicSetup } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"

let editor = new EditorView({
  extensions: [basicSetup, javascript()],
  parent: document.body
})
```

接下来，我们得安装必要的依赖包。[@rollup/plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve#readme) 是必须安装的依赖包，用来指导 rollup 解析 Node 风格的依赖，好让 rollup 可以根据 `@codemirror/lang-javascript` 找到 `node_modules/@codemirror/lang-javascript/dist/index.js` 文件。


``` bash
# The CodeMirror packages used in our script
npm i codemirror @codemirror/lang-javascript
# Rollup and its plugin
npm i rollup @rollup/plugin-node-resolve
```

通过这些，我们可以使用 rollup 来创建一个 bundle 文件。

``` shell
node_modules/.bin/rollup editor.mjs -f iife -o editor.bundle.js \
  -p @rollup/plugin-node-resolve
```

`-f iife` 告诉 Rollup 输出的文件应该被格式化作为一个 “立即调用表达式(immediately-invoked function expression)”，而不是其他模块风格，比如 CommonJS 或者 UMD。这意味着代码可以被包装在会立刻调用的匿名函数里面，利用函数的作用域作为局部命名空间，好让变量不会暴露在全局作用域中。

`-o` 选项表示需要写入的输出文件，`-p` 选项加载解析插件。也可以通过创建一个配置文件（明明为 rollup.config.mjs）, 然后运行 `rollup -c` 调用该配置文件。

``` javascript
import { nodeResolve } from "@rollup/plugin-node-resolve"

export default {
  input: "./editor.mjs",
  output: {
    file: "./editor.bundle.js",
    format: "iife"
  },
  plugins: [nodeResolve()]
}
```
现在你可以在 HTML 文件中添加 script 标签来加载 bundle 文件。

``` html
<!doctype html>
<meta charset=utf8>
<h1>CodeMirror!</h1>
<script src="editor.bundle.js"></script>
```

## Bundle 尺寸

本库是 10万行 JavaScript 的工程，连带着完整的源码（包括注释和空白行），如果以最简单的方式打包会生成一个巨大文件（包含[基础配置](https://codemirror.net/docs/ref/#codemirror.basicSetup)和一个语言模式大概是 1MB）。使用一些工具比如 [Terser](https://terser.org/) 或者 [Babel](https://babeljs.io/) 来去除注释和空白行，使用重命名为更短的变量名，你可以削减一半多的尺寸，生成的 bundle 大概是 400KB 左右（通过网络传输时压缩后大概 135KB）。

本库被设计为可以被聪明的打包器削减掉没有使用的代码，比如：Rollup （这个工能叫做 “树摇”）。最小尺寸的编辑器（如下），避免了加载一些列的拓展。完整包大概 700KB，削减后250K（压缩后 75KB）。

``` javascript
import { EditorView, minimalSetup } from "codemirror"

let editor = new EditorView({
  extensions: minimalSetup,
  parent: document.body
})

```

如果你需要支持多门语言，通常会在需要的时候动态加载语言支持包，避免浏览器一次性加载大量代码。[Rollup文档](https://rollupjs.org/guide/en/#code-splitting)会告诉你怎么做到这一点。

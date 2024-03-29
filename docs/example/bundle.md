---
layout: home
pageClass: limited-width-page
---
# 案例：Rollup

CodeMirror 是作为一系列模块分发。不太能直接被浏览器加载 —— 尽管现代浏览器可以加载 EcmaScript 模块，但编写的时候，它们解决进一步依赖关系的机制仍然太原始，无法加载NPM分布式模块的集合。

（虽然说，我们仍然有方案可以通过服务端重写依赖让它工作，像是 [Snowpack](https://www.snowpack.dev/) 或者 [esmoduleserve](https://github.com/marijnh/esmoduleserve)。我完全建议在开发过程中使用这样的解决方案，因为它在更改文件时往往会引入较少的链接和延迟，但对于实际部署，您暂时需要进行经典的绑定。）

Bundlers are tools that take a given main script (or in some cases multiple scripts), and produce a new, generally bigger, script that has all (or some) of the script's dependencies (and their dependencies, and so on) included. This makes it easier to run modern JavaScript systems, which tend to consist of a whole graph of dependencies, in the browser. (But also, for example, to combine a library package written as a group of files into a single file before uploading it to NPM.)

As far as bundler software goes, I'm a big fan of Rollup. But there are also other systems, like Webpack and Parcel, that work well and have their own advantages.

To use Rollup to create a bundle that loads CodeMirror, you must first write a main script (say, editor.mjs) that imports the library and creates the editor view.

``` javascript
import {EditorView, basicSetup} from "codemirror"
import {javascript} from "@codemirror/lang-javascript"

let editor = new EditorView({
  extensions: [basicSetup, javascript()],
  parent: document.body
})
```

Next, we must install the necessary packages. The @rollup/plugin-node-resolve package is necessary to teach rollup to resolve node-style dependencies, so that it knows to find "@codemirror/lang-javascript" under node_modules/@codemirror/lang-javascript/dist/index.js.

``` bash
# The CodeMirror packages used in our script
npm i codemirror @codemirror/lang-javascript
# Rollup and its plugin
npm i rollup @rollup/plugin-node-resolve
```

With these, we can run rollup to create the bundle file.

```
node_modules/.bin/rollup editor.mjs -f iife -o editor.bundle.js \
  -p @rollup/plugin-node-resolve
```

The -f iife file tells Rollup that the output file should be formatted as an "immediately-invoked function expression" (as opposed to other module styles, such as CommonJS or UMD). This means the code will be wrapped in an anonymous function that is then immediately called, using that function's scope as a local namespace so that its variables don't end up in the global scope.

The -o option indicates which output file to write to, and the -p option loads the resolution plugin. You can also create a configuration file (called rollup.config.mjs) and just run rollup -c to take the configuration from that file.

``` javascript
import {nodeResolve} from "@rollup/plugin-node-resolve"
export default {
  input: "./editor.mjs",
  output: {
    file: "./editor.bundle.js",
    format: "iife"
  },
  plugins: [nodeResolve()]
}
```

Now if you load your bundle with a script tag you'll see the editor in your HTML page.

``` html
<!doctype html>
<meta charset=utf8>
<h1>CodeMirror!</h1>
<script src="editor.bundle.js"></script>
```

## 打包尺寸

Because the library is a hundred-thousand-line marvel of JavaScript engineering, shipped with its full source code (including comments and whitespace), bundles built in the most straightforward way can get somewhat big (around 1 megabyte for the basic setup and a language mode). You can more than halve this by using something like Terser or Babel to strip the comments and whitespace, and rename variables to use shorter names, getting the full bundle down to around 400 kilobytes (135 kilobytes when gzipped for transfer over the network).

The library is built in such a way that unused code can be eliminated by a smart bundler like Rollup (a feature called “tree shaking”). The most minimal editor (see below) avoids loading a bunch of extensions, taking the full bundle size down to 700 kilobytes and reducing the stripped code to 250 kilobytes (75 kilobytes gzipped).

``` javascript
import {EditorView, minimalSetup} from "codemirror"

let editor = new EditorView({
  extensions: minimalSetup,
  parent: document.body
})

```

When you need to support multiple languages, it can often be useful to dynamically load the language support packages as needed to avoid the amount of code the browser has to load. The Rollup documentation can tell you more about how to do this.

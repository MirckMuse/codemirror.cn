---
layout: home
markdown.anchor: false
pageClass: limited-width-page
---

<script lang="ts" setup>
import { ref } from "vue";
import { features, langs } from "./config"
import HomeFeature from "./components/HomeFeature.vue"
</script>

<style>
ul.grid-list-3 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  padding: 0;
  gap: 17px;
}

ul.grid-list-5 > li,
ul.grid-list-3 > li {
  display: block;
}
ul.grid-list-5 > li + li,
ul.grid-list-3 > li + li {
  margin-top: 0;
}

ul.grid-list-5 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  padding: 0;
}
</style>

<h1>可扩展代码编辑器</h1>

CodeMirror 是用于 Web 的代码编辑器组件。它可以在网站中用于实现文本输入字段，支持许多编辑功能，并具有丰富的编程接口以允许进一步扩展。

<!-- // TODO: code editor -->

这是一个 CodeMirror 例子，配置用于编辑 JavaScript 代码。

<h2>特性</h2>
<ul class="grid-list-3">
  <li v-for="feature in features" :key="feature.title">
    <HomeFeature :feature="feature"></HomeFeature>
  </li>  
</ul>

<h2>关于</h2> 

CodeMirror 开源许可证为 [MIT](https://github.com/codemirror/dev/blob/master/LICENSE)。在 [GitHub](https://github.com/codemirror/dev) 上开发。

该库支持 IE11 之后的浏览器 (使用若干 [polyfill](https://codemirror.net/examples/ie11/))。

你可以在 [forum](https://discuss.codemirror.net/)上询问、讨论本项目。 Bugs应该通过 [issue tracker](https://github.com/codemirror/dev/issues) 上报。我们的目标是成为一个包容、热情的社区。为了做到这一点，我们有一个适用于项目沟通的 [行为准则](http://contributor-covenant.org/version/1/1/0/)。
<h2>语言支持</h2>

以下语言是全量的解析器包，包含领域语言的集成和扩展代码：

<ul class="grid-list-5">
  <li v-for="lang in langs" :key="lang.title">
    <HomeFeature :feature="lang"></HomeFeature>
  </li>  
</ul>

还有一个可以使用的 [CodeMirror 5 modes](https://github.com/codemirror/legacy-modes) 集合, 以及一个 [社区](https://codemirror.net/docs/community#language) 维护的语言包列表。如果上面没有列出您的语言，您仍然可以在那里找到解决方案。

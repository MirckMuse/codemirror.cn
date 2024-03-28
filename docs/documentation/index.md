---
pageClass: limited-width-page
---

<script lang="ts" setup>
import HomeFeature from "../components/HomeFeature.vue"

const prefix = "/codemirror.cn/documentation"

const docs = [
  {
    title: "系统指南",
    desc: "对系统的描述，以及实现一些共同目标的指南。",
    link: `${prefix}/guide`
  },
  {
    title: "指引手册",
    desc: "库导出的公共API的完整列表和说明。",
    link: `https://codemirror.net/docs/ref/`
  },
  {
    title: "核心拓展",
    desc: "核心包中可用扩展的有序集合。",
    link: `https://codemirror.net/docs/extensions/`
  },
  {
    title: "案例",
    desc: "一组示例，展示了如何实现各种用例。",
    link: `/codemirror.cn/example/`
  },
  {
    title: "迁移指南",
    desc: "从CodeMirror 5 迁移",
    link: `https://codemirror.net/docs/migration/`
  },
  {
    title: "社区包",
    desc: "社区维护的CodeMirror相关包。",
    link: `https://codemirror.net/docs/community/`
  },
  {
    title: "更新日志",
    desc: "更新日志",
    link: `https://codemirror.net/docs/changelog/`
  }
]
</script>

# 文档

<ul class="grid-list">
  <li v-for="doc in docs" :key="doc.title" style="font-size: 20px">
    <HomeFeature :feature="doc"></HomeFeature>
  </li>  
</ul>
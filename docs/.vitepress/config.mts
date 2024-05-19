import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/codemirror.cn/",
  title: "CodeMirror [持续翻译]",
  lastUpdated: true,
  appearance: false,
  head: [
    ["meta", { name: "description", content: "CodeMirror 是用于 Web 的代码编辑器组件。它可以在网站中用于实现文本输入字段，支持许多编辑功能，并具有丰富的编程接口以允许进一步扩展。" }],
    ["meta", { name: "keywords", content: "codemirror,javascript,代码编辑器" }],
    ['link', { rel: 'icon', href: '/codemirror.cn/logo.svg?2' }]
  ],
  themeConfig: {
    logo: '/logo.svg',

    nav: [
      {
        text: '案例',
        link: '/example/',
        activeMatch: "/example/"
      },
      {
        text: '文档',
        link: '/documentation/',
        activeMatch: "/documentation/"
      },
      { text: '尝试', link: 'https://codemirror.net/try/' },
      { text: 'Discuss', link: 'https://discuss.codemirror.net/' },
      { text: 'Github', link: 'https://github.com/codemirror/dev/' },
      { text: 'Version 5', link: 'https://codemirror.net/5/' },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/MirckMuse/codemirror.cn' }
    ],

    lastUpdated: {
      text: "最后更新于"
    },
    outline: {
      label: '页面导航',
      level: 2
    }
  }
})

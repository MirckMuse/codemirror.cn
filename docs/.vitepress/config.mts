import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: "/codemirror.cn/",
  title: "CodeMirror",
  lastUpdated: true,
  head: [
    ["meta", { name: "description", content: "codemirror code editor" }],
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
      // { icon: 'github', link: 'https://github.com/codemirror/dev/' }
    ]
  }
})

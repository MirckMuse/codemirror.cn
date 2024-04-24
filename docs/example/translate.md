# 案例：国际化

代码编辑器插件通常情况下不需要显示大量的UI文本，但其中一些插件在不显示（或[说](https://codemirror.net/docs/ref/#view.EditorView%5Eannounce)）一些人类语言文本的情况下无法正常工作。为了能够做到这一点，而不会被可能使用错误语言的硬编码文本所困扰，CodeMirror 包含翻译的基础功能。

这种支持与真正的国际化库所支持的不一样，那超过我们实现的目标。它只允许您使用[短语 facet](https://codemirror.net/docs/ref/#state.EditorState%5Ephrases) 为特定的固定字符串提供翻译的字符串，并提供一种[短语方法](https://codemirror.net/docs/ref/#state.EditorState.phrase)，如果有可用的字符串，该方法将返回您提供的翻译后的字符串，否则返回内置字符串。

我们建议创建一些可复用组件，在需要向用户显示人类文本的地方调用 `state.phrase`.

另外，我们强烈建议调用 `/\bphrase\(/` 正则表达式，这样可以更容易找到对应翻译。为了翻译您的组件，首先得需要弄清楚它使用了哪些短语。

在这一点上，核心模块中没有字符串的翻译库。唯一需要处理的是下面的例子，它将保持最新，以涵盖翻译基本CodeMirror设置所需的短语。

## 德语 CodeMirror

这是一张短语映射，将核心包中使用的短语从英语翻译成德语。您可以根据它来翻译其他语言。

``` javascript
const germanPhrases = {
  // @codemirror/view
  "Control character": "Steuerzeichen",
  // @codemirror/commands
  "Selection deleted": "Auswahl gelöscht",
  // @codemirror/language
  "Folded lines": "Eingeklappte Zeilen",
  "Unfolded lines": "Ausgeklappte Zeilen",
  "to": "bis",
  "folded code": "eingeklappter Code",
  "unfold": "ausklappen",
  "Fold line": "Zeile einklappen",
  "Unfold line": "Zeile ausklappen",
  // @codemirror/search
  "Go to line": "Springe zu Zeile",
  "go": "OK",
  "Find": "Suchen",
  "Replace": "Ersetzen",
  "next": "nächste",
  "previous": "vorherige",
  "all": "alle",
  "match case": "groß/klein beachten",
  "by word": "ganze Wörter",
  "replace": "ersetzen",
  "replace all": "alle ersetzen",
  "close": "schließen",
  "current match": "aktueller Treffer",
  "replaced $ matches": "$ Treffer ersetzt",
  "replaced match on line $": "Treffer on Zeile $ ersetzt",
  "on line": "auf Zeile",
  // @codemirror/autocomplete
  "Completions": "Vervollständigungen",
  // @codemirror/lint
  "Diagnostics": "Diagnosen",
  "No diagnostics": "Keine Diagnosen",
}
```

您可以在您的配置中包括 `EditorState.phrases.of(germanPhrases)` 这样的表达式来启用翻译。

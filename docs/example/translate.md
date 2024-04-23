# 案例：国际化

代码编辑器插件通常情况下不需要显示大量的UI文本，但其中一些插件在不显示（或说）一些人类语言文本的情况下无法正常工作。为了能够做到这一点，而不会被可能使用错误语言的硬编码文本所困扰，CodeMirror包含可翻译短语的基本功能。

Code editor plugins usually don't need to show a lot of UI text, but some of them can't get by without showing (or speaking) some human-language text. In order to be able to this without being stuck with hard-coded text that might be in the wrong language, CodeMirror contains rudimentary functionality for translatable phrases.

这种支持与真正的国际化库所支持的不一样，因为这样做太过分了。它只允许您使用短语方面为特定的固定字符串提供翻译的字符串，并提供一种短语方法，如果有可用的字符串，该方法将返回您提供的字符串的翻译形式，否则返回原始字符串。

This support is not up to par with what real internationalization libraries support, because that would be overkill for this purpose. It just allows you to use the phrases facet to provide translated strings for specific fixed strings, and provides a phrase method which will return the translated form of the string you give it if one is available, or the original string otherwise.

因此，鼓励可重用组件在向用户显示的每个人类语言字符串周围调用state.phrase。

Thus, reusable components are encouraged to put a call to state.phrase around every human-language string they show to the user.

我们还强烈建议您确保您的调用与/\bphrase\（/）等模式匹配，这样它们相对容易找到——为了翻译您的组件，人们首先需要弄清楚它使用了哪些短语。

You are also strongly encouraged to make sure your calls match a pattern like /\bphrase\(/, so that they are relatively easy to find—in order to translate your component, people will first need to figure out which phrases it uses.

在这一点上，核心模块中没有字符串的翻译库。唯一需要处理的是下面的例子，它将保持最新，以涵盖翻译基本CodeMirror设置所需的短语。

There is not, at this point, a repository of translations for the strings in the core modules. The only thing to work with is the example below, which will be kept up to date to cover the phrases needed to translate a basic CodeMirror setup.

## 德语 CodeMirror

这是一张短语地图，将核心包中使用的短语从英语翻译成德语。你可以根据它来翻译其他语言。

This is a map of phrases translating the phrases used in the core packages from English to German. You could base your own translations for other languages on it.

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

考虑到这一点，您可以在您的配置中包括EditorState.frases.of（germanPhrases）这样的表达式来启用翻译。

Given that, you can include an expression like EditorState.phrases.of(germanPhrases) in your configuration to enable the translation.

# 案例：自动补全

The @codemirror/autocomplete package provides functionality for displaying input suggestions in the editor. This example shows how to enable it and how to write your own completion sources.

## 设置

Autocompletion is enabled by including the autocompletion extension (which is included in the basic setup) in your configuration. Some language packages come with support for proper autocompletion built in, such as the HTML package.

By default, the plugin will look for completions whenever the user types something, but you can configure it to only run when activated explicitly via a command.

The default completion keymap binds Ctrl-Space to start completion, arrows to select a completion, Enter to pick it, and Escape to close the tooltip. It is activated by default when you add the extension, but you can disable that if you want to provide your own bindings.

The default bindings do not bind Tab to acceptCompletion, for reasons outlined in the Tab-handling example.

## 提供补全

The completions that the extension shows come from one or more completion sources, which are functions that take a completion context—an object with information about the completion being requested—and return an object that describes the range that's being completed and the options to show. Sources may run asynchronously by returning a promise.

The easiest way to connect a completion source to an editor is to use the override option.

This editor uses the following completion function:

``` typescript
import {CompletionContext} from "@codemirror/autocomplete"

function myCompletions(context: CompletionContext) {
  let word = context.matchBefore(/\w*/)
  if (word.from == word.to && !context.explicit)
    return null
  return {
    from: word.from,
    options: [
      {label: "match", type: "keyword"},
      {label: "hello", type: "variable", info: "(World)"},
      {label: "magic", type: "text", apply: "⠁⭒*.✩.*⭒⠁", detail: "macro"}
    ]
  }
}
```

This is a very crude way to provide completions, without really looking at the editing context at all. But it demonstrates the basic things a completion function must do.

+ Figure out which bit of text before the cursor could be completed. Here we use the matchBefore method to determine it with a regular expression.

+ Check whether completion is appropriate at all. The explicit flag indicates whether the completion was started explicitly, via the command, or implicitly, by typing. You should generally only return results when the completion happens explicitly or the completion position is after some construct that can be completed.

+ Build up a list of completions and return it, along with its start position. (The end position defaults to the position where completion happens.)

Completions themselves are objects with a label property, which provides both the text to show in the options list and the text to insert when the completion is picked.

By default, the completion list shows only the label. You'll usually also want to provide a type property, which determines the icon shown next to the completion. detail can be given to show a short string after the label, and info can be used for longer text, shown in a window to the side of the list when the completion is selected.

To override what happens when a completion is picked, you can use the apply property, which can be either a string to replace the completion range with, or a function that will be called to apply an arbitrary action.

When you are providing your completion source as a generic extension, or working with mixed-language documents, setting a global source is not practical. When no override is given, the plugin uses EditorState.languageDataAt with the name "autocomplete" to look up language-appropriate completion functions. Registering those is done with a language object's data facet. For example by including something like this in your state configuration:

``` javascript
myLanguage.data.of({
  autocomplete: myCompletions
})
```

You can also directly put an array of completion objects in this property, which will cause the library to simply use those (wrapped by completeFromList) as a source.

## 排序和筛选

The trivial completion source used above didn't have to filter completions against the input—the plugin will take care of that. It uses a form of fuzzy matching to filter and rank completions against the currently typed text, and will highlight the letters in each completion that match.

To influence the ranking of completions, you can give completion objects a boost property, which adds to or subtracts from their match score.

If you really do want to filter and order completions yourself, you can include a filter: false property in your result object to disable the built-in filtering.

## 完成结果的校验

Some sources need to recompute their results on every keypress, but for many of them, this is unnecessary and inefficient. They return a full list of completions for a given construct, and as long as the user is typing (or backspacing) inside that construct, that same list can be used (filtered for the currently typed input) to populate the completion list.

This is why it is very much recommended to provide a validFor property on your completion result. It should contain a function or regular expression that tells the extension that, as long as the updated input (the range between the result's from property and the completion point) matches that value, it can continue to use the list of completions.

In the myCompletions function above, since all its completions are simple words, a value like validFor: /^\w*$/ would be appropriate.

## 根据语法补全

To make a completion source a bit more intelligent, it is often useful to inspect the syntax tree around the completion point, and use that to get a better picture of what kind of construct is being completed.

As an example, this completion source for JavaScript will complete (some) JSDoc tags in block comments.

``` javascript
import {syntaxTree} from "@codemirror/language"

const tagOptions = [
  "constructor", "deprecated", "link", "param", "returns", "type"
].map(tag => ({label: "@" + tag, type: "keyword"}))

function completeJSDoc(context: CompletionContext) {
  let nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1)
  if (nodeBefore.name != "BlockComment" ||
      context.state.sliceDoc(nodeBefore.from, nodeBefore.from + 3) != "/**")
    return null
  let textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
  let tagBefore = /@\w*$/.exec(textBefore)
  if (!tagBefore && !context.explicit) return null
  return {
    from: tagBefore ? nodeBefore.from + tagBefore.index : context.pos,
    options: tagOptions,
    validFor: /^(@\w*)?$/
  }
}
```

The function starts by finding the syntax node directly in front of the completion position. If that is not a block comment, or it is a block comment without a /** start marker, it returns null to indicate it has no completions.

If the completion does happen in a block comment, we check whether there is an existing tag in front of it. If there is, that is included in the completion (see the from property in the returned object). If there isn't, we only complete if the completion was explicitly started.

You can now use an extension like this to enable this completion source for JavaScript content.

``` javascript
import {javascriptLanguage} from "@codemirror/lang-javascript"

const jsDocCompletions = javascriptLanguage.data.of({
  autocomplete: completeJSDoc
})
```

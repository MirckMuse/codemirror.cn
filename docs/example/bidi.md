# 案例：从右到左文本

To create a basic editor for Arabic or Hebrew text, you only need to style the editor or some parent document with a direction: rtl property.

Of course, in a code editor context, you will often be dealing with a bunch of Latin syntax or tag names, causing right-to-left text to become heavily bidirectional. Editing mixed-direction text is, by its very nature, somewhat messy and confusing, but CodeMirror tries to make it bearable wherever it can.

Cursor motion (as defined in the default keymaps) is visual, meaning that if you press the left arrow your cursor should move left, regardless of the direction of the text at the cursor position.

Some other commands work in a logical direction—for example Backspace deletes before of the cursor, which is to the left in left-to-right text, and to the right in right-to-left text. Similarly, Delete deletes text after the cursor.

When you define custom commands that work in a visual way, you should check the local text direction, and use that to determine which way to go (possibly using the forward argument to something like moveByChar).

``` javascript
function cursorSemicolonLeft(view: EditorView) {
  let from = view.state.selection.main.head
  let dir = view.textDirectionAt(from)
  let line = view.state.doc.lineAt(from)
  let found = dir == Direction.LTR
    ? line.text.lastIndexOf(";", from - line.from)
    : line.text.indexOf(";", from - line.from)
  if (found < 0) return false
  view.dispatch({
    selection: {anchor: found + line.from},
    scrollIntoView: true,
    userEvent: "select"
  })
  return true
}
```

When writing extensions, take care to not assume a left-to-right layout. Either set up your CSS to use direction-aware properties or, if that doesn't work, explicitly check the global editor direction and adjust your behavior to that.

## 双向隔离

A common issue with bidirectional programming or markup text is that the standard algorithm for laying the text out associates neutral punctuation characters between two pieces of directional text with the wrong side. See for example this right-to-left HTML code:

<pre style="text-align: right">
  &lt;/span>الأزرق&lt;span class="blue">النص 
</pre>

Though in the logical text, the \<span class="blue"\> appears as a coherent string, the algorithm will consider the punctuation "\> to be part of the nearby right-to-left text, because that is the line's base direction. This results in an unreadable mess.

Thus, it can be useful to add elements with a unicode-bidi: isolate style around sections that should be ordered separate from the surrounding text. This bit of code does that for HTML tags:

``` javascript
import {EditorView, Direction, ViewPlugin, ViewUpdate,
        Decoration, DecorationSet} from "@codemirror/view"
import {Prec} from "@codemirror/state"
import {syntaxTree} from "@codemirror/language"
import {Tree} from "@lezer/common"

const htmlIsolates = ViewPlugin.fromClass(class {
  isolates: DecorationSet
  tree: Tree

  constructor(view: EditorView) {
    this.isolates = computeIsolates(view)
    this.tree = syntaxTree(view.state)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged ||
        syntaxTree(update.state) != this.tree) {
      this.isolates = computeIsolates(update.view)
      this.tree = syntaxTree(update.state)
    }
  }
}, {
  provide: plugin => {
    function access(view: EditorView) {
      return view.plugin(plugin)?.isolates ?? Decoration.none
    }
    return Prec.lowest([EditorView.decorations.of(access),
                        EditorView.bidiIsolatedRanges.of(access)])
  }
})
```

This computes a set of decorations and keeps it up to date as the editor state changes. It provides the set to both the decoration and isolated range facets—the first makes sure the editable HTML is rendered appropriately, the second that CodeMirror's own order computations match the rendered order.

Because styling something as isolated only works if it is rendered as a single HTML element, we don't want other decorations to break up the isolating decorations. Because lower-precedence decorations are rendered around higher-precedence ones, we use Prec.lowest to give this extension a very low precedence.

computeIsolates uses the syntax tree to compute decorations for HTML tags in the visible ranges.

``` javascript
import {RangeSetBuilder} from "@codemirror/state"

const isolate = Decoration.mark({
  attributes: {style: "direction: ltr; unicode-bidi: isolate"},
  bidiIsolate: Direction.LTR
})

function computeIsolates(view: EditorView) {
  let set = new RangeSetBuilder<Decoration>()
  for (let {from, to} of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter(node) {
        if (node.name == "OpenTag" || node.name == "CloseTag" ||
            node.name == "SelfClosingTag")
          set.add(node.from, node.to, isolate)
      }
    })
  }
  return set.finish()
}
```

Here's an editor showing this extension in action. Note that the HTML tags are shown coherently left-to-right.

# 案例：协同编辑

实时协同编辑是一种技术，不同机器上的多个人可以同时编辑同一文档。更改会通过网络传播给其他参与者，并在他们到达后立即显示在文档视图中。

Real-time collaborative editing is a technique where multiple people on different machines can edit the same document at the same time. Changes are propagated to other participants over the network and show up in their views of the document as soon as they arrive.

以下是此页面中的玩具协作编辑设置：

Here's a toy collaborative editing setup that lives within this page:

这种编辑风格的主要困难是处理相互冲突的编辑——由于网络通信不是即时的，人们有可能同时做出改变，当再次同步每个人时，必须以某种方式进行协调。

The main difficulty with this style of editing is handling of conflicting edits—since network communication isn't instantaneous, it is possible for people to make changes at the same time, which have to be reconciled in some way when synchronizing everybody up again.

CodeMirror提供了基于操作转换的协作编辑实用程序，该实用程序具有为更改分配明确顺序的中央机构（服务器）。此示例描述了设置这样一个系统所需的实用信息。有关更多理论信息，请参阅这篇博客文章。

CodeMirror comes with utilities for collaborative editing based on operational transformation with a central authority (server) that assigns a definite order to the changes. This example describes the practical information you need to set up such a system. For more theoretical information, see this blog post.

（也可以将不同的协作编辑算法连接到CodeMirror。例如，请参见Yjs。）

(It is also possible to wire up different collaborative editing algorithms to CodeMirror. See for example Yjs.)

## 原则

使用@codemirror/colab包实现的协作系统是这样工作的：

Collaborative systems implemented with the @codemirror/collab package work like this:

+ 有一个中央系统（权威机构）建立了一个变革的历史。
+ There is a central system (authority) that builds up a history of changes.
+ 个人编辑（同行）跟踪他们与权威机构历史的哪个版本同步，以及他们在此基础上进行了哪些本地（未经证实）更改。
+ Individual editors (peers) track which version of the authority's history they have synchronized with, and which local (unconfirmed) changes they have made on top of that.
+ 所有同行都设置了某种方式来接收来自权威机构的新更改。当变化来临时。。。
+ All peers set up some way to receive new changes from the authority. When changes come in...
  + 如果其中一些更改是对等方自己的更改，则这些更改将从未经确认的更改列表中删除。
  + If some of those changes are the peer's own changes, those changes are removed from the list of unconfirmed changes.
  + 远程更改将应用于本地编辑器状态。
  + Remote changes are applied to the local editor state.
  + 如果存在未确认的更改，则使用操作转换将远程更改转换为未确认的本地更改，反之亦然，以便远程更改可以应用于对等方的当前文档，并且更新的本地更改可以提交到服务器，就好像它们是在远程更改之后发生的一样。
  + If there are unconfirmed changes present, operational transformation is used to transpose the remote changes across the unconfirmed local ones, and vice versa, so that the remote changes can be applied to the peer's current document, and the updated local changes can be submitted to the server as if they came after the remote changes.
  + 同行的文档版本向前移动。
  + The peer's document version is moved forward.
+ 每当有未经确认的本地更改时，对等方应尝试将它们连同其当前同步版本一起发送给授权机构。
+ Whenever there are unconfirmed local changes, the peer should try to send them to the authority, along with its current synchronized version.
  + 如果该版本与服务器的版本相匹配，则服务器将按原样接受更改并将其添加到其历史记录中。
  + If that version matches the server's version, the server accepts the changes as-is and adds them to its history.
  + 否则，服务器可以根据其复杂程度以及是否可以访问自客户端版本以来发生的所有更改，拒绝更新，或者重新设置基础并接受更新。
  + Otherwise, the server can, depending on how complex it is and on whether it has access to all the changes that happened since the client's version, either reject the updates, or rebase and accept them.

对等方必须应用的更棘手的逻辑在@codemirror/colab包中实现，但要建立协作系统，必须实现权限（这可能非常简单），并连接对等方和权限之间的通信（由于网络/异步系统的性质，这可能会变得更微妙）。

The more tricky logic that a peer must apply is implemented in the @codemirror/collab package, but to set up a collaborative system you must implement the authority (which can be very simple) and wire up the communication between the peers and the authority (which can get a bit more subtle due to the nature of networked/asynchronous systems).

## The Authority

在这个例子中，权威是一个网络工作者。这有助于模拟通信的异步性质，以及串行化通过通信通道的数据的需要，同时仍然允许所有内容在浏览器内运行。在现实世界中，它通常是一个使用HTTP请求或WebSocket与对等方通信的服务器程序。

In this example, the authority is a web worker. That helps simulate the asynchronous nature of communication, and the need to serialize data that goes over the communication channel, while still allowing everything to run inside the browser. In the real world, it'll typically be a server program communicating with peers using HTTP requests or websockets.

为了简洁起见，整个示例中将省略错误处理。

Error handling will be omitted throughout the example to keep things concise.

权威机构保存的状态只是一组更新（包含一个更改集和一个客户端ID）和一个当前文档。

The state kept by the authority is just an array of updates (holding a change set and a client ID), and a current document.

``` javascript
import {ChangeSet, Text} from "@codemirror/state"
import {Update, rebaseUpdates} from "@codemirror/collab"

// The updates received so far (updates.length gives the current
// version)
let updates: Update[] = []
// The current document
let doc = Text.of(["Start document"])
```

该文档由新的对等方使用，以便能够加入会话——他们必须向权威机构申请开始文档和版本，然后才能参与。

The document is used by new peers to be able to join the session—they must ask the authority for a starting document and version before they are able to participate.

这段代码实现了工作者处理的三种消息类型。

This code implements the three message types that the worker handles.

+ pullUpdates用于询问权威机构自给定文档版本以来是否有任何新的更新。当被问及当前版本时，它会“阻止”，直到出现新的更改（这就是挂起变量的用途）。
+ pullUpdates is used to ask the authority if any new updates have come in since a given document version. It “blocks” until new changes come in when asked for the current version (this is what the pending variable is used for).

+ pushUpdates用于发送一组更新。服务器存储更新，向前滚动文档，并通知任何等待的pullUpdates请求。
+ pushUpdates is used to send an array of updates. The server stores the updates, rolls its document forward, and notifies any waiting pullUpdates requests.

+ 新对等方使用getDocument来检索启动状态。
+ getDocument is used by new peers to retrieve a starting state.

我们将使用一种基于postMessage和消息通道的粗略机制来在主页和工作程序之间进行通信。请随意忽略resp中与消息通道相关的代码，因为这在这里并不重要。

We'll use a crude mechanism based on postMessage and message channels to communicate between the main page and the worker. Feel free to ignore the message-channel-related code in resp, since that's not terribly relevant here.

``` typescript
let pending: ((value: any) => void)[] = []

self.onmessage = event => {
  function resp(value: any) {
    event.ports[0].postMessage(JSON.stringify(value))
  }
  let data = JSON.parse(event.data)
  if (data.type == "pullUpdates") {
    if (data.version < updates.length)
      resp(updates.slice(data.version))
    else
      pending.push(resp)
  } else if (data.type == "pushUpdates") {
    // Convert the JSON representation to an actual ChangeSet
    // instance
    let received = data.updates.map(json => ({
      clientID: json.clientID,
      changes: ChangeSet.fromJSON(json.changes)
    }))
    if (data.version != updates.length)
      received = rebaseUpdates(received, updates.slice(data.version))
    for (let update of received) {
      updates.push(update)
      doc = update.changes.apply(doc)
    }
    resp(true)
    if (received.length) {
      // Notify pending requests
      let json = received.map(update => ({
        clientID: update.clientID,
        changes: update.changes.toJSON()
      }))
      while (pending.length) pending.pop()!(json)
    }
  } else if (data.type == "getDocument") {
    resp({version: updates.length, doc: doc.toString()})
  }
}
```

在@codemirror/colab的旧版本中，rebaseUpdates不存在——处理客户端版本与服务器文档版本不匹配的更新的方法就是简单地拒绝它们。客户端必须获取对等更新，然后重试。

In older versions of @codemirror/collab, rebaseUpdates didn't exist the way to handle updates where the client's version didn't match the server's document version was to simply reject them. The client would have to fetch peer updates and try again.


这仍然是实现协议的一种合理方式，但在某些情况下可能会导致饥饿——如果客户端的延迟比其对等端更高，而这些对等端不断提交更改，那么它可能会在很长一段时间内无法完成更新，因为它们不断被拒绝。因此，建议在可行的情况下重新调整更新的基础。如果你不存储更新的完整历史记录，而只存储最近的更新，那么拒绝一个版本不再有更新对象的请求仍然是合理的。

This is still a reasonable way to implement the protocol, but it can in some circumstances lead to starvation—if a client has a higher latency than its peers, and those peers keep submitting changes, it may be unable to get its updates through for a long time, as they keep getting rejected. Thus, it is recommended to rebase updates whenever practical. If you don't store the full history of updates, but only recent ones, it is still reasonable to reject requests with a version that you don't have the update objects for anymore.

## The Peer

在连接的另一边，我正在使用一些混乱的魔术代码来引入假延迟和断开的连接（上面演示中的剪刀控件）。这不是很有趣，所以我把它隐藏在一个Connection类中，该类在下面的代码中被省略了（你可以在GitHub上找到完整的代码）。

On the other side of the connection, I'm using some messy magic code to introduce fake latency and broken connections (the scissor controls in the demo above). This isn't very interesting, so I'm hiding it in a Connection class which is omitted from the code below (you can find the full code on GitHub).

这些包装器通过消息与工作进程进行交互，返回一个promise，该promise最终会得到解决（当连接被切断时，promise将一直挂起，直到重新建立为止）。

These wrappers interact with the worker process through messages, returning a promise that eventually resolves with some result (when the connection is cut, the promises will just hang until it is reestablished).

``` javascript
function pushUpdates(
  connection: Connection,
  version: number,
  fullUpdates: readonly Update[]
): Promise<boolean> {
  // Strip off transaction data
  let updates = fullUpdates.map(u => ({
    clientID: u.clientID,
    changes: u.changes.toJSON()
  }))
  return connection.request({type: "pushUpdates", version, updates})
}

function pullUpdates(
  connection: Connection,
  version: number
): Promise<readonly Update[]> {
  return connection.request({type: "pullUpdates", version})
    .then(updates => updates.map(u => ({
      changes: ChangeSet.fromJSON(u.changes),
      clientID: u.clientID
    })))
}

function getDocument(
  connection: Connection
): Promise<{version: number, doc: Text}> {
  return connection.request({type: "getDocument"}).then(data => ({
    version: data.version,
    doc: Text.of(data.doc.split("\n"))
  }))
}
```

为了管理与权威机构的通信，我们使用了一个视图插件（它几乎总是CodeMirror中异步逻辑的正确位置）。这个插件会不断地（在异步循环中）尝试引入新的更新，如果它得到了这些更新，就会使用receiveUpdates函数将它们应用到编辑器中。

To manage the communication with the authority, we use a view plugin (which are almost always the right place for asynchronous logic in CodeMirror). This plugin will constantly (in an async loop) try to pull in new updates and, if it gets them, apply them to the editor using the receiveUpdates function.


当编辑器的内容发生变化时，插件开始尝试推送其本地更新。它保留一个字段，以确保只有一个正在运行的推送请求，并粗略地设置一个超时，以便在请求后仍有未经确认的更改时重试推送。当推送失败或在推送过程中引入新的更改时，可能会发生这种情况。

When the content of the editor changes, the plugin starts trying to push its local updates. It keeps a field to make sure it only has one running push request, and crudely sets a timeout to retry pushing when there are still unconfirmed changes after the request. This can happen when the push failed or new changes were introduced while it was in progress.

（在实际设置中，请求调度肯定是你想以更精细的方式进行的。在单个状态机中同时包括推送和拉取功能会有所帮助，在该状态机中，对等方一次只执行两个操作中的一个。）

(The request scheduling is something you'll definitely want to do in a more elaborate way in a real setup. It can help to include both pushing and pulling in a single state machine, where the peer only does one of the two at a time.)

peerExtension函数返回这样一个插件和一个用适当的启动版本配置的collab扩展。

The peerExtension function returns such a plugin plus a collab extension configured with the appropriate start version.

``` javascript
function peerExtension(startVersion: number, connection: Connection) {
  let plugin = ViewPlugin.fromClass(class {
    private pushing = false
    private done = false

    constructor(private view: EditorView) { this.pull() }

    update(update: ViewUpdate) {
      if (update.docChanged) this.push()
    }

    async push() {
      let updates = sendableUpdates(this.view.state)
      if (this.pushing || !updates.length) return
      this.pushing = true
      let version = getSyncedVersion(this.view.state)
      await pushUpdates(connection, version, updates)
      this.pushing = false
      // Regardless of whether the push failed or new updates came in
      // while it was running, try again if there's updates remaining
      if (sendableUpdates(this.view.state).length)
        setTimeout(() => this.push(), 100)
    }

    async pull() {
      while (!this.done) {
        let version = getSyncedVersion(this.view.state)
        let updates = await pullUpdates(connection, version)
        this.view.dispatch(receiveUpdates(this.view.state, updates))
      }
    }

    destroy() { this.done = true }
  })
  return [collab({startVersion}), plugin]
}
```

现在，您可以使用这样的代码创建一个连接的编辑器视图。

Now you can create a wired-up editor view with code like this.

``` typescript
async function createPeer(connection: Connection) {
  let {version, doc} = await getDocument(connection)
  let state = EditorState.create({
    doc,
    extensions: [basicSetup, peerExtension(version, connection)]
  })
  return new EditorView({state})
}
```

## Dropping Old Updates


这个实现为编辑器中的每一个更改无休止地累积更新。

This implementation endlessly accumulates updates for every single change made in the editors.

这可能是好的，甚至是有用的，因为它提供了文档如何编写的详细历史记录（尤其是如果您添加了时间戳和用户标识符等额外数据）。

This can be okay, or even useful, since it provides a detailed history of how the document was written (especially if you add additional data like timestamps and user identifiers).

但当你不想要或不需要它时，有可能在某个时候开始删除旧的更新。这样做的缺点是，自进行这些更新以来一直处于脱机状态的对等方将无法再与授权机构重新同步。他们将要求提供自给定版本以来的所有更新，这些数据将不再可用。根据使用情况和所涉及的时间段，这可能是可以接受的。

But when you don't want or need it, it is possible to, at some point, start dropping old updates. The downside of this is that it will no longer be possible for peers that have been offline since those updates were made to resynchronize with the authority. They will ask for all updates since a given version, and that data will no longer be available. Depending on the use case and the time period involved, this may be acceptable.

还可以使用ChangeSet.compose“压缩”更改，以存储粒度较小的历史记录。这仍然会阻止对等方进行同步（当他们要求压缩掉的版本时），但当对旧数据进行同步时，可以大大减少历史数据的大小。

It is also possible to “compress” changes using ChangeSet.compose to store a less finely grained history. This will still prevent peers from synchronizing (when they ask for a version that has been compressed away), but when done on old data it can greatly reduce the size of the history data.

## Shared Effects

默认情况下，通过这种协作编辑渠道共享的唯一内容是文档更改（更新对象中的更改字段）。有时，还可以使用此机制来共享应该在客户端之间分发的其他信息，这是非常有用的。

By default, the only thing that is shared through such a collaborative-editing channel is document changes (the changes field in the update objects). Sometimes it is useful to also use this mechanism to share other information that should be distributed between clients.

为此，在调用collab扩展构造函数时，可以传递一个sharedEffects函数，该函数从事务中生成一个“共享效果”数组。共享效果是StateEffect的实例，也应应用于其他对等方。在最简单的情况下，sharedEffects可以过滤事务的效果，挑选出特定类型的事务。

To do that, when calling the collab extension constructor, you can pass a sharedEffects function which produces an array of “shared effects” from a transaction. Shared effects are instances of StateEffect that should be applied in other peers as well. In the simplest case, sharedEffects could just filter the transaction's effects, picking out specific types of transactions.

例如，我们有一个插件跟踪文档中标记的区域。编辑器保留一个包含标记区域集合的状态字段，并具有用于向其中添加区域的markRegion效果。

Say, for example, we have a plugin tracking marked regions in the document. Editors keep a state field with a collection of marked regions, and have a markRegion effect that they use to add regions to this.

``` typescript
import {StateEffect} from "@codemirror/state"

const markRegion = StateEffect.define<{from: number, to: number}>({
  map({from, to}, changes) {
    from = changes.mapPos(from, 1)
    to = changes.mapPos(to, -1)
    return from < to ? {from, to} : undefined
  }
})
```

由于效果指的是文档中的位置，因此需要一个映射函数来映射文档更改。collab包在协调本地和远程更改时也将使用此方法。

Since the effect refers to positions in the document, it needs a map function to map it through document changes. This will also be used by the collab package when reconciling local and remote changes.

现在，有了像这样的函数作为sharedEffects源，我们可以在Update对象中获得这些效果：

Now with a function like this as sharedEffects source, we'd get these effects in our Update objects:

``` javascript
import {collab} from "@codemirror/collab"

let markCollab = {
  // ...
  sharedEffects: tr => tr.effects.filter(e => e.is(markRegion))
}
```

该库不提供任何用于序列化效果的实用程序，因此为了将它们作为JSON发送，您需要为更新中的效果字段提供自己的自定义序列化代码。

The library doesn't provide any utilities for serializing effects, so in order to send them around as JSON you need your own custom serialization code for the effects field in updates.

但是，一旦你设置好了，假设所有对等端都安装了一些处理这些效果的扩展，那么在对等端之间应用它们就可以了。这些效果会应用到receiveUpdates创建的事务中，管理这些标记的状态字段会从中提取它们。

But once you set that up, assuming that all peers have some extension that handles these effects installed, applying them across peers should just work. The effects get applied in transactions created by receiveUpdates, and the state field that manages such marks will pick them up from there.

不过有一件事需要记住。正如协作编辑博客文章中更详细地描述的那样，当不同的对等方以不同的顺序应用时，效果的映射函数中所做的位置映射不能保证收敛到相同的位置。对于某些用例（例如显示其他人的光标），这可能是无害的。对于其他人，您可能需要设置一个单独的机制来定期同步位置。

There is one thing to keep in mind though. As described in more detail in the collaborative-editing blog post, the kind of position mapping done in the effect's map function is not guaranteed to converge to the same positions when applied in different order by different peers. For some use cases (such as showing other people's cursor), this may be harmless. For others, you might need to set up a separate mechanism to periodically synchronize the positions.


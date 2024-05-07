# 案例：协同编辑

Real-time collaborative editing is a technique where multiple people on different machines can edit the same document at the same time. Changes are propagated to other participants over the network and show up in their views of the document as soon as they arrive.

Here's a toy collaborative editing setup that lives within this page:

The main difficulty with this style of editing is handling of conflicting edits—since network communication isn't instantaneous, it is possible for people to make changes at the same time, which have to be reconciled in some way when synchronizing everybody up again.

CodeMirror comes with utilities for collaborative editing based on operational transformation with a central authority (server) that assigns a definite order to the changes. This example describes the practical information you need to set up such a system. For more theoretical information, see this blog post.

(It is also possible to wire up different collaborative editing algorithms to CodeMirror. See for example Yjs.)

## 原则

Collaborative systems implemented with the @codemirror/collab package work like this:

+ There is a central system (authority) that builds up a history of changes.
+ Individual editors (peers) track which version of the authority's history they have synchronized with, and which local (unconfirmed) changes they have made on top of that.
+ All peers set up some way to receive new changes from the authority. When changes come in...
  + If some of those changes are the peer's own changes, those changes are removed from the list of unconfirmed changes.
  + Remote changes are applied to the local editor state.
  + If there are unconfirmed changes present, operational transformation is used to transpose the remote changes across the unconfirmed local ones, and vice versa, so that the remote changes can be applied to the peer's current document, and the updated local changes can be submitted to the server as if they came after the remote changes.
  + The peer's document version is moved forward.
+ Whenever there are unconfirmed local changes, the peer should try to send them to the authority, along with its current synchronized version.
  + If that version matches the server's version, the server accepts the changes as-is and adds them to its history.
  + Otherwise, the server can, depending on how complex it is and on whether it has access to all the changes that happened since the client's version, either reject the updates, or rebase and accept them.
  
The more tricky logic that a peer must apply is implemented in the @codemirror/collab package, but to set up a collaborative system you must implement the authority (which can be very simple) and wire up the communication between the peers and the authority (which can get a bit more subtle due to the nature of networked/asynchronous systems).

## The Authority

In this example, the authority is a web worker. That helps simulate the asynchronous nature of communication, and the need to serialize data that goes over the communication channel, while still allowing everything to run inside the browser. In the real world, it'll typically be a server program communicating with peers using HTTP requests or websockets.

Error handling will be omitted throughout the example to keep things concise.

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

The document is used by new peers to be able to join the session—they must ask the authority for a starting document and version before they are able to participate.

This code implements the three message types that the worker handles.

+ pullUpdates is used to ask the authority if any new updates have come in since a given document version. It “blocks” until new changes come in when asked for the current version (this is what the pending variable is used for).

+ pushUpdates is used to send an array of updates. The server stores the updates, rolls its document forward, and notifies any waiting pullUpdates requests.

+ getDocument is used by new peers to retrieve a starting state.

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

In older versions of @codemirror/collab, rebaseUpdates didn't exist the way to handle updates where the client's version didn't match the server's document version was to simply reject them. The client would have to fetch peer updates and try again.

This is still a reasonable way to implement the protocol, but it can in some circumstances lead to starvation—if a client has a higher latency than its peers, and those peers keep submitting changes, it may be unable to get its updates through for a long time, as they keep getting rejected. Thus, it is recommended to rebase updates whenever practical. If you don't store the full history of updates, but only recent ones, it is still reasonable to reject requests with a version that you don't have the update objects for anymore.

## The Peer

On the other side of the connection, I'm using some messy magic code to introduce fake latency and broken connections (the scissor controls in the demo above). This isn't very interesting, so I'm hiding it in a Connection class which is omitted from the code below (you can find the full code on GitHub).

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

To manage the communication with the authority, we use a view plugin (which are almost always the right place for asynchronous logic in CodeMirror). This plugin will constantly (in an async loop) try to pull in new updates and, if it gets them, apply them to the editor using the receiveUpdates function.

When the content of the editor changes, the plugin starts trying to push its local updates. It keeps a field to make sure it only has one running push request, and crudely sets a timeout to retry pushing when there are still unconfirmed changes after the request. This can happen when the push failed or new changes were introduced while it was in progress.

(The request scheduling is something you'll definitely want to do in a more elaborate way in a real setup. It can help to include both pushing and pulling in a single state machine, where the peer only does one of the two at a time.)

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

This implementation endlessly accumulates updates for every single change made in the editors.

This can be okay, or even useful, since it provides a detailed history of how the document was written (especially if you add additional data like timestamps and user identifiers).

But when you don't want or need it, it is possible to, at some point, start dropping old updates. The downside of this is that it will no longer be possible for peers that have been offline since those updates were made to resynchronize with the authority. They will ask for all updates since a given version, and that data will no longer be available. Depending on the use case and the time period involved, this may be acceptable.

It is also possible to “compress” changes using ChangeSet.compose to store a less finely grained history. This will still prevent peers from synchronizing (when they ask for a version that has been compressed away), but when done on old data it can greatly reduce the size of the history data.

## Shared Effects

By default, the only thing that is shared through such a collaborative-editing channel is document changes (the changes field in the update objects). Sometimes it is useful to also use this mechanism to share other information that should be distributed between clients.

To do that, when calling the collab extension constructor, you can pass a sharedEffects function which produces an array of “shared effects” from a transaction. Shared effects are instances of StateEffect that should be applied in other peers as well. In the simplest case, sharedEffects could just filter the transaction's effects, picking out specific types of transactions.

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

Since the effect refers to positions in the document, it needs a map function to map it through document changes. This will also be used by the collab package when reconciling local and remote changes.

Now with a function like this as sharedEffects source, we'd get these effects in our Update objects:

``` javascript
import {collab} from "@codemirror/collab"

let markCollab = {
  // ...
  sharedEffects: tr => tr.effects.filter(e => e.is(markRegion))
}
```

The library doesn't provide any utilities for serializing effects, so in order to send them around as JSON you need your own custom serialization code for the effects field in updates.

But once you set that up, assuming that all peers have some extension that handles these effects installed, applying them across peers should just work. The effects get applied in transactions created by receiveUpdates, and the state field that manages such marks will pick them up from there.

There is one thing to keep in mind though. As described in more detail in the collaborative-editing blog post, the kind of position mapping done in the effect's map function is not guaranteed to converge to the same positions when applied in different order by different peers. For some use cases (such as showing other people's cursor), this may be harmless. For others, you might need to set up a separate mechanism to periodically synchronize the positions.


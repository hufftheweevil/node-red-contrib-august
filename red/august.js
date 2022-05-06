module.exports = function (RED) {
  /* ---------------------------------- Class --------------------------------- */

  function August(config) {
    // Get account configuration and ref the underlying api
    let accountNode = RED.nodes.getNode(config.account)
    if (!accountNode) return
    const api = accountNode.api

    // Create a RED node
    RED.nodes.createNode(this, config)
    const node = this

    this.subscribed = null

    // Data/request from node, pass to api and return response
    node.on('input', async (msg, send, done) => {
      let lockId = config.lock || msg.topic
      let command = msg.payload

      let output = payload => send({ topic: lockId, payload, command })

      try {
        switch (command) {
          case 'getLocks':
            output(await api.locks())
            break

          case 'getDetails':
            output(await api.details(lockId))
            break

          case 'getStatus':
            output(await api.status(lockId))
            break

          case 'lock':
            output(await api.lock(lockId))
            break

          case 'unlock':
            output(await api.unlock(lockId))
            break

          case 'subscribe':
            if (this.subscribed) return // don't subscribe twice
            this.subscribed = await api.subscribe(lockId, output)
            let text = 'Listening to '
            if (lockId) {
              let _lock = await api.details(lockId)
              text += `${_lock.LockName} (${_lock.HouseName})`
            } else {
              text += 'all'
            }
            node.status({ fill: 'green', shape: 'dot', text })
            return

          case 'unsubscribe':
            this.subscribed?.() // unsubscribe
            this.subscribed = null
            node.status({})
            return

          default:
            node.warn(`August command not supported: ${command}`)
        }
      } catch (err) {
        done(err.message)
      }
    })

    node.on('close', () => {
      this.subscribed?.() // unsubscribe if subscribed
    })
  }

  /* -------------------------------- Register -------------------------------- */

  RED.nodes.registerType('august', August)
}

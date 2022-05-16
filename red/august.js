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

    node.subscribed = null

    let subscribe = async lockId => {
      if (node.subscribed) return // don't subscribe twice

      node.subscribed = await api.subscribe(lockId, payload =>
        node.send({
          topic: payload.lockID ?? payload.LockID ?? payload.lockId,
          payload,
          command: 'event'
        })
      )

      let text = 'Listening to '
      if (lockId) {
        let _lock = await api.details(lockId)
        text += `${_lock?.LockName} (${_lock?.HouseName})`
      } else {
        text += 'all'
      }
      node.status({ fill: 'green', shape: 'dot', text })
    }

    // If auto-subscribe is enabled, subscribe to the lock (or all locks if undefined)
    if (config.autoSubscribe) subscribe(config.lock)

    // Data/request from node, pass to api and return response
    node.on('input', async (msg, send, done) => {
      let lockId = config.lock || msg.topic
      let command = msg.payload

      let output = payload => send({ topic: lockId, payload, command })

      try {
        switch (command) {
          case 'getLocks':
            output(await api.locks())
            return

          case 'getDetails':
            output(await api.details(lockId))
            return

          case 'getStatus':
            output(await api.status(lockId))
            return

          case 'lock':
            output(await api.lock(lockId))
            return

          case 'unlock':
            output(await api.unlock(lockId))
            return

          case 'subscribe':
            subscribe(lockId)
            return

          case 'unsubscribe':
            node.subscribed?.() // unsubscribe
            node.subscribed = null
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
      node.subscribed?.() // unsubscribe if subscribed
    })
  }

  /* -------------------------------- Register -------------------------------- */

  RED.nodes.registerType('august', August)
}

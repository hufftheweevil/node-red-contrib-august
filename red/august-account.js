let AugustAPI = require('august-api')
// let AugustAPI = require('../tests/mock-api.js')

module.exports = function (RED) {
  /* --------------------------------- Global --------------------------------- */

  let Accounts = new Map()

  /* ---------------------------------- Class --------------------------------- */

  function AugustAccount(config) {
    RED.nodes.createNode(this, config)

    // Setup client/connection
    try {
      this.api = new AugustAPI({
        installId: config.id, // Use node ID (means any new config node must be validated)
        augustId: config.augustId,
        password: this.credentials.password,
        countryCode: config.api === 'Yale Home' ? 'non-US' : 'US' // Can be any value other than 'US' for Yale Home
      })
      this.api.validated = config.validated // TEST ONLY
    } catch (err) {
      this.error(err.message, err.stack)
      return
    }

    Accounts.set(config.id, this)
  }

  /* -------------------------------- Register -------------------------------- */

  RED.nodes.registerType('august-account', AugustAccount, {
    credentials: {
      password: { type: 'password' }
    }
  })

  /* ---------------------------- Admin endpoints ----------------------------- */

  RED.httpAdmin.post('/august/auth', async function (req, res) {
    let { config, code } = req.body

    if (!config) {
      res.status(500).send('Missing arguments to auth august')
      return
    }

    if (!code) {
      let ok = await AugustAPI.authorize(config)
      if (ok) res.status(200).send()
      else res.status(500).send('Failed to authorize')
    } else {
      let ok = await AugustAPI.validate(config, code)
      if (ok) res.status(200).send()
      else res.status(500).send('Failed to validate')
    }
  })

  RED.httpAdmin.post('/august/listLocks', async function (req, res) {
    let config = req.body

    if (!config.password || config.password === '__PWRD__')
      config.password = RED.nodes.getNode(config.installId)?.credentials?.password

    let locks = await AugustAPI.locks(config)

    if (locks) res.status(200).send(Object.entries(locks).map(([id, lock]) => ({ id, ...lock })))
    else res.status(500).send('Failed to get locks')
  })
}

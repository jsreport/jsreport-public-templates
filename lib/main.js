/*!
 * Copyright(c) 2018 Jan Blaha
 *
 * Extension allows to share report template with non authenticated users by providing
 * auth tokens.
 */

const uuid = require('uuid').v4

async function generateSharingToken (reporter, shortid, req) {
  const template = await reporter.documentStore.collection('templates').findOne({ shortid: shortid }, req)

  if (!template) {
    throw reporter.createError(`Unable to find template with shortid: ${shortid}`, {
      statusCode: 400
    })
  }

  const token = uuid()

  template.readSharingToken = token

  await reporter.documentStore.collection('templates').update({ shortid: shortid }, {
    $set: {
      readSharingToken: template.readSharingToken
    }
  }, req)

  return token
}

function routes (reporter) {
  return (app) => {
    app.post('/api/templates/sharing/:shortid/access/:access', (req, res, next) => {
      generateSharingToken(reporter, req.params.shortid, req).then((token) => {
        res.send({
          token: token
        })
      }).catch(next)
    })

    app.get('/public-templates', (req, res, next) => {
      reporter.documentStore.collection('templates').findOne({ readSharingToken: req.query.access_token }).then((template) => {
        if (!template) {
          res.setHeader('WWW-Authenticate', (req.authSchema || 'Basic') + ' realm=\'realm\'')
          return res.status(401).end()
        }

        reporter.express.render({
          template
        }, req, res, next)
      }).catch(next)
    })
  }
}

module.exports = (reporter, definition) => {
  if (!reporter.documentStore.model.entityTypes.TemplateType || !reporter.authentication || !reporter.authorization) {
    definition.options.enabled = false
    return
  }

  reporter.documentStore.model.entityTypes['TemplateType'].readSharingToken = { type: 'Edm.String' }
  reporter.on('express-configure', routes(reporter))
  reporter.initializeListeners.add('public-templates', () => reporter.emit('export-public-route', '/public-templates'))
}

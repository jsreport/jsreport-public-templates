process.env.debug = 'jsreport'
const supertest = require('supertest')
const jsreport = require('jsreport-core')
require('should')

const authOptions = {
  'cookieSession': {
    'secret': 'dasd321as56d1sd5s61vdv32'
  },
  'admin': {
    'username': 'admin',
    'password': 'password'
  }
}

describe('public-templates', function () {
  let reporter

  beforeEach(function () {
    reporter = jsreport({ authentication: authOptions, tasks: { strategy: 'in-process' } })
    reporter.use(require('../')())
    reporter.use(require('jsreport-templates')())
    reporter.use(require('jsreport-express')())
    reporter.use(require('jsreport-authentication')())
    reporter.use(require('jsreport-authorization')())

    return reporter.init()
  })

  it('generating read sharing token should add readSharingToken into template', async () => {
    const template = await reporter.documentStore.collection('templates').insert({
      content: 'content', engine: 'none', recipe: 'html', name: 'foo'
    })

    const token = await reporter.publicTemplates.generateSharingToken(template.shortid, 'read')
    token.should.be.ok()
    const refreshedTemplates = await reporter.documentStore.collection('templates').find({shortid: template.shortid})
    refreshedTemplates[0].readSharingToken.should.be.ok()
  })

  it('generating write sharing token should add writeSharingToken into template', async () => {
    const template = await reporter.documentStore.collection('templates').insert({
      content: 'content', engine: 'none', recipe: 'html', name: 'foo'
    })

    const token = await reporter.publicTemplates.generateSharingToken(template.shortid, 'write')
    token.should.be.ok()
    const refreshedTemplates = await reporter.documentStore.collection('templates').find({shortid: template.shortid})
    refreshedTemplates[0].writeSharingToken.should.be.ok()
  })

  it('rendering report should fail when req.options.authorization.readToken not specified', async () => {
    const template = await reporter.documentStore.collection('templates').insert({
      content: 'content', engine: 'none', recipe: 'html', name: 'foo'
    })
    const req = {
      user: null,
      url: '/api/report',
      template: {shortid: template.shortid},
      query: {},
      body: {}
    }

    try {
      await reporter.render(req)
      throw new Error('Rendering report without auth options should fail.')
    } catch (e) {
      e.message.should.not.be.eql('Rendering report without auth options should fail.')
    }
  })

  it.only('rendering report should fail when req.options.authorization.readToken has invalid token', async () => {
    const template = await reporter.documentStore.collection('templates').insert({
      content: 'content', engine: 'none', recipe: 'html', name: 'foo'
    })
    const req = {
      user: null,
      url: '/api/report',
      template: {shortid: template.shortid},
      query: {},
      body: {options: {authorization: {readToken: 'invalid'}}},
      options: {authorization: {readToken: 'invalid'}}
    }

    try {
      await reporter.render(req)
      throw new Error('Rendering report without auth options should fail.')
    } catch (e) {
      e.message.should.not.be.eql('Rendering report without auth options should fail.')
    }
  })

  it('rendering report should succeed when rendering outside an http context', async () => {
    const template = await reporter.documentStore.collection('templates').insert({
      content: 'content', engine: 'none', recipe: 'html', name: 'foo'
    })
    await reporter.render({
      template: { shortid: template.shortid }
    })
  })

  it('rendering report should succeed with valid req.options.authorization.readToken', async () => {
    const template = await reporter.documentStore.collection('templates').insert({
      content: 'content', engine: 'none', recipe: 'html', name: 'foo', readSharingToken: 'token'
    })

    const req = {
      user: null,
      url: '/api/report',
      template: {shortid: template.shortid},
      query: {},
      body: {options: {authorization: {readToken: 'token'}}},
      options: {authorization: {readToken: 'token'}}
    }
    return reporter.render(req)
  })

  it('rendering report should succeed with valid req.options.authorization.writeToken', async () => {
    const template = await reporter.documentStore.collection('templates').insert({
      content: 'content', engine: 'none', recipe: 'html', name: 'foo', writeSharingToken: 'token'
    })
    const req = {
      user: null,
      url: '/api/report',
      body: {options: {authorization: {writeToken: 'token'}}},
      options: {authorization: {writeToken: 'token'}},
      template: {shortid: template.shortid},
      query: {}
    }
    return reporter.render(req)
  })

  it('rendering report with req.options.authorization.grantRead should add token to the template', async () => {
    const req = {user: {_id: 'foo'}}
    const template = await reporter.documentStore.collection('templates').insert({
      content: 'content', engine: 'none', recipe: 'html', name: 'foo'
    }, req)

    await reporter.render({
      template: {shortid: template.shortid},
      options: {authorization: {grantRead: true}},
      user: {_id: 'foo'}
    })

    const refreshedTemplates = await reporter.documentStore.collection('templates').find({shortid: template.shortid})
    refreshedTemplates[0].readSharingToken.should.be.ok()
  })

  it('rendering report with req.options.authorization.grantWrite should add token to the template', async () => {
    const req = {user: {_id: 'foo'}}
    const template = await reporter.documentStore.collection('templates').insert({
      content: 'content', engine: 'none', recipe: 'html', name: 'foo'
    }, req)
    await reporter.render({
      template: {shortid: template.shortid},
      options: {authorization: {grantWrite: true}},
      user: {_id: 'foo'}
    })
    const refreshedTempaltes = reporter.documentStore.collection('templates').find({shortid: template.shortid})
    refreshedTempaltes[0].writeSharingToken.should.be.ok()
  })
})

describe('public-templates', () => {
  let reporter

  beforeEach(() => {
    reporter = jsreport({
      authentication: authOptions
    })

    reporter.use(require('../')())
    reporter.use(require('jsreport-templates')())
    reporter.use(require('jsreport-express')())
    reporter.use(require('jsreport-authentication')())
    reporter.use(require('jsreport-authorization')())

    return reporter.init()
  })

  it('/odata/templates without access token should response 401', () => {
    return supertest(reporter.express.app)
        .get('/odata/templates')
        .expect(401)
  })

  it('/odata/templates with access token should response 200', async () => {
    const req = {user: {username: 'foo', _id: 'foo'}, query: {}}

    await reporter.documentStore.collection('templates').insert({
      content: 'content', engine: 'none', recipe: 'html', name: 'foo', readSharingToken: 'foo'
    }, req)

    req.user = null
    return supertest(reporter.express.app)
            .get('/odata/templates?access_token=foo')
            .expect(200)
  })

  it('/public-templates?access_token=xxx should render template', async () => {
    const req = {user: {username: 'foo', _id: 'foo'}, query: {}}

    await reporter.documentStore.collection('templates').insert({
      content: 'content', engine: 'none', recipe: 'html', name: 'foo', readSharingToken: 'foo'
    }, req)
    req.user = null
    return supertest(reporter.express.app)
            .get('/public-templates?access_token=foo')
            .expect(200)
  })
})

import React, {Component, PropTypes} from 'react'
import Studio from 'jsreport-studio'
import Style from './ShareModal.scss'

export default class ShareModal extends Component {
  static propTypes = {
    close: PropTypes.func.isRequired,
    options: PropTypes.object.isRequired
  }

  componentWillMount () {
    this.state = { entity: this.props.options.entity }
  }

  async generateLink (method) {
    const response = await Studio.api.get(`/api/templates/sharing/${this.props.options.entity.shortid}/grant/${method}`)
    const entity = this.state.entity
    const tokenProperty = method + 'SharingToken'
    const updated = {
      ...entity,
      [tokenProperty]: response.token
    }
    Studio.updateEntity(updated)
    this.setState({ entity: updated })
  }

  render () {
    const { entity } = this.state

    return <div>
      <h2>Link with read permissions</h2>
      {entity.readSharingToken ? <div>
        <a target='_blank' href={Studio.rootUrl + `/public-templates?access_token=${entity.readSharingToken}`}>
          {Studio.rootUrl + `/public-templates?access_token=${entity.readSharingToken}`}
        </a>
      </div> : <div>
        <button type='button' className='button confirmation' onClick={() => this.generateLink('read')}>Generate Read Link
        </button>
      </div>
      }
      <div className={Style.infoBox}>
        When requesting this link, jsreport will skip the authentication and authorization and render this
        particular template. User will be also able to execute
        any of the jsreport recipes from the served page but won't be allowed to access any of the existing
        templates or other entities.
      </div>

      <h2>Link with write permissions</h2>
      {entity.writeSharingToken ? <div>
        <a target='_blank' href={Studio.rootUrl + `/public-templates?access_token=${entity.writeSharingToken}`}>
          {Studio.rootUrl + `/public-templates?access_token=${entity.writeSharingToken}`}
        </a>
      </div> : <div>
        <button type='button' className='button confirmation' onClick={() => this.generateLink('write')}>Generate Write Link
        </button>
      </div>
      }
      <div className={Style.infoBox}>
        In addition to the "read link" user will be also able to update this particular template for example using
        jsreport embedded editor.
      </div>

      <div className='button-bar'>
        <button className='button confirmation' onClick={() => this.props.close()}>ok</button>
      </div>
    </div>
  }
}

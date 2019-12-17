import React from 'react'
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { ConnectedRouter } from 'connected-react-router'
import store from './store'
import App from './containers/app'
import createHistory from 'history/createBrowserHistory';

import 'sanitize.css/sanitize.css'
import './index.css'


import BASE_URL from './serverUrl'

console.log("API BASE_URL: " + BASE_URL);
console.log("PUBLIC URL: " + process.env.PUBLIC_URL);

const target = document.querySelector('#root')

const history = createHistory({
  basename: process.env.PUBLIC_URL,
});

render(
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <div>
        <App />
      </div>
    </ConnectedRouter>
  </Provider>,
  target
)

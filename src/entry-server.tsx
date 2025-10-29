import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import AppServer from './App-server'

export function render(url: string) {
  const html = renderToString(
    <StaticRouter location={url}>
      <AppServer />
    </StaticRouter>
  )
  return { html }
}

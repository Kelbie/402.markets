import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Import the server entry
const { render } = await import('../dist/server/entry-server.js')

// Define the routes to prerender
const routes = [
  '/',
  '/dashboard',
  // Add more routes as needed
]

// Create the prerendered HTML files
let hasErrors = false

for (const route of routes) {
  try {
    const { html } = render(route)
    
    // Create directory if it doesn't exist
    const outputPath = path.join(__dirname, '../dist', route === '/' ? 'index.html' : `${route}/index.html`)
    const outputDir = path.dirname(outputPath)
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // Read the template HTML
    const templatePath = path.join(__dirname, '../dist/index.html')
    const template = fs.readFileSync(templatePath, 'utf-8')
    
    // Replace the root div with the prerendered content
    const prerenderedHtml = template.replace(
      '<div id="root"></div>',
      `<div id="root">${html}</div>`
    )
    
    // Write the prerendered HTML
    fs.writeFileSync(outputPath, prerenderedHtml)
    console.log(`Prerendered: ${route}`)
  } catch (error) {
    console.error(`Error prerendering ${route}:`, error)
    hasErrors = true
  }
}

console.log('Prerendering complete!')
process.exit(hasErrors ? 1 : 0)

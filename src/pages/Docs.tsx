import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, AlertCircle, ChevronDown, ExternalLink, Github, Zap, Shield, Code, Terminal } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { LoginModal } from "@/components/login-modal"
import type { NostrUser } from "@/lib/types"

export default function Docs() {
  const [selectedTool, setSelectedTool] = useState<'nak' | 'ndk'>('nak')
  const [activeSection, setActiveSection] = useState('discovery')
  const [user, setUser] = useState<NostrUser | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  
  // Refs for sections
  const discoveryRef = useRef<HTMLDivElement>(null)
  const reactionsRef = useRef<HTMLDivElement>(null)
  const p2pkRef = useRef<HTMLDivElement>(null)
  const l402Ref = useRef<HTMLDivElement>(null)
  const setupApiRef = useRef<HTMLDivElement>(null)
  const toolsRef = useRef<HTMLDivElement>(null)

  // Refs for each section's columns
  const discoveryLeftRef = useRef<HTMLDivElement>(null)
  const discoveryRightRef = useRef<HTMLDivElement>(null)
  const reactionsLeftRef = useRef<HTMLDivElement>(null)
  const reactionsRightRef = useRef<HTMLDivElement>(null)
  const p2pkLeftRef = useRef<HTMLDivElement>(null)
  const p2pkRightRef = useRef<HTMLDivElement>(null)
  const l402LeftRef = useRef<HTMLDivElement>(null)
  const l402RightRef = useRef<HTMLDivElement>(null)

  // Handle user authentication
  useEffect(() => {
    const storedUser = localStorage.getItem("nostr_user")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error("Failed to parse stored user:", error)
      }
    }
  }, [])

  const handleLoginSuccess = (loggedInUser: NostrUser) => {
    setUser(loggedInUser)
    localStorage.setItem("nostr_user", JSON.stringify(loggedInUser))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("nostr_user")
  }

  // Handle scroll to update active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { ref: discoveryRef, id: 'discovery' },
        { ref: reactionsRef, id: 'reactions' },
        { ref: p2pkRef, id: 'p2pk' },
        { ref: l402Ref, id: 'l402' },
        { ref: setupApiRef, id: 'setup-api' },
        { ref: toolsRef, id: 'tools' }
      ]

      const windowHeight = window.innerHeight
      
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i]
        if (section.ref.current) {
          const rect = section.ref.current.getBoundingClientRect()
          if (rect.top <= windowHeight * 0.3) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Call once on mount
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const codeExamples = {
    discovery: {
      nak: `# Find all APIs in the 402.markets ecosystem
nak req -k 30078 -t t=402.markets -l 50 wss://relay.damus.io

# Find a specific API by d tag
nak req -k 30078 -t t=402.markets -t d=my-api-id wss://relay.damus.io

# Find APIs by author
nak req -k 30078 -t t=402.markets -a <author-pubkey> wss://relay.damus.io`,
      ndk: `import { NDK } from '@ndk/nostr-development-kit'

const ndk = new NDK({ 
  explicitRelayUrls: ['wss://relay.damus.io'] 
})
await ndk.connect()

// Find all APIs
const apis = await ndk.fetchEvents({
  kinds: [30078],
  '#t': ['402.markets'],
  limit: 50
})

// Find specific API by d tag
const specificApi = await ndk.fetchEvent({
  kinds: [30078],
  '#t': ['402.markets'],
  '#d': ['my-api-id']
})

// Find APIs by author
const authorApis = await ndk.fetchEvents({
  kinds: [30078],
  '#t': ['402.markets'],
  authors: ['<author-pubkey>']
})`
    },
    reactions: {
      nak: `# Get all reactions for a specific API event
nak req -k 7 -t e=<event-id> -l 100 wss://relay.damus.io

# Get reactions for multiple events
nak req -k 7 -t e=<event-id-1> -t e=<event-id-2> wss://relay.damus.io

# Get reactions by specific user
nak req -k 7 -t e=<event-id> -a <user-pubkey> wss://relay.damus.io`,
      ndk: `import { NDK } from '@ndk/nostr-development-kit'

const ndk = new NDK({ 
  explicitRelayUrls: ['wss://relay.damus.io'] 
})
await ndk.connect()

// Get reactions for specific event
const reactions = await ndk.fetchEvents({
  kinds: [7],
  '#e': ['<event-id>'],
  limit: 100
})

// Get reactions for multiple events
const multipleReactions = await ndk.fetchEvents({
  kinds: [7],
  '#e': ['<event-id-1>', '<event-id-2>']
})

// Get reactions by specific user
const userReactions = await ndk.fetchEvents({
  kinds: [7],
  '#e': ['<event-id>'],
  authors: ['<user-pubkey>']
})`
    },
    p2pk: `import { CashuWallet, CashuMint, getEncodedTokenV4, decodePaymentRequest } from '@cashu/cashu-ts'

// Initialize Cashu wallet
const mintUrl = 'https://your-cashu-mint.com'
const mint = new CashuMint(mintUrl)
const wallet = new CashuWallet(mint)

async function payForApiAccessP2PK(apiUrl) {
  // 1. Get payment request from API
  const response = await fetch(apiUrl, { method: 'GET' })

  if (response.status === 402) {
    const xCashu = response.headers.get('X-Cashu')
    if (xCashu) {
      // 2. Decode payment request (base64 encoded)
      const paymentRequest = decodePaymentRequest(xCashu)
      const amount = paymentRequest.amount
      const pubkey = paymentRequest.nut10?.data // P2PK public key
      
      // 3. Load mint and send tokens with P2PK lock
      await wallet.loadMint()
      
      
      // Send tokens with P2PK lock
      const { send } = await wallet.send(amount, { pubkey: pubkey })
      
      // 4. Create token with P2PK-locked proofs
      const token = getEncodedTokenV4({ 
        mint: mintUrl, 
        proofs: send 
      })
      
      // 5. Make authenticated request
      const paidResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': \`Cashu \${token}\`,
          'Content-Type': 'application/json'
        }
      })
      
      return await paidResponse.json()
    }
  }
  
  return await response.json()
}

// Usage
payForApiAccessP2PK('https://api.example.com/endpoint')
  .then(data => console.log('API response:', data))
  .catch(error => console.error('Error:', error))`,
    l402: `// L402 Lightning payment example
async function payForApiAccessL402(apiUrl) {
  // 1. Get Lightning invoice from API
  const response = await fetch(apiUrl, { method: 'GET' })

  if (response.status === 402) {
    const wwwAuth = response.headers.get('WWW-Authenticate')
    if (wwwAuth) {
      // 2. Parse L402 header: L402 macaroon="...", invoice="..."
      const macaroon = wwwAuth.match(/macaroon="([^"]+)"/)?.[1]
      const invoice = wwwAuth.match(/invoice="([^"]+)"/)?.[1]
      
      if (macaroon && invoice) {
        // 3. Pay Lightning invoice using your Lightning wallet
        // This step requires a Lightning wallet implementation
        const preimage = await payLightningInvoice(invoice)
        
        // 4. Make authenticated request with preimage
        const paidResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': \`L402 \${macaroon}:\${preimage}\`,
            'Content-Type': 'application/json'
          }
        })
        
        return await paidResponse.json()
      }
    }
  }
  
  return await response.json()
}

// Helper function to pay Lightning invoice (implement with your Lightning wallet)
async function payLightningInvoice(invoice) {
  // Implementation depends on your Lightning wallet
  // Examples: LND, CLN, LNURL, or Cashu melt
  throw new Error('Implement Lightning payment with your wallet')
}

// Usage
payForApiAccessL402('https://api.example.com/endpoint')
  .then(data => console.log('API response:', data))
  .catch(error => console.error('Error:', error))`
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        user={user}
        currentPage="docs"
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} onLoginSuccess={handleLoginSuccess} />

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Left Column - Navigation */}
          <div className="w-48 flex-shrink-0">
            <div className="sticky top-8">
              <nav className="space-y-2">
                <h2 className="font-semibold text-lg mb-4">Documentation</h2>
                <a 
                  href="#discovery" 
                  className={`block py-2 px-3 rounded-md text-sm hover:bg-accent transition-colors ${activeSection === 'discovery' ? 'bg-accent font-medium' : ''}`}
                >
                  API Discovery
                </a>
                <a 
                  href="#reactions" 
                  className={`block py-2 px-3 rounded-md text-sm hover:bg-accent transition-colors ${activeSection === 'reactions' ? 'bg-accent font-medium' : ''}`}
                >
                  Getting Reactions
                </a>
                <a 
                  href="#p2pk" 
                  className={`block py-2 px-3 rounded-md text-sm hover:bg-accent transition-colors ${activeSection === 'p2pk' ? 'bg-accent font-medium' : ''}`}
                >
                  P2PK Payments
                </a>
                <a 
                  href="#l402" 
                  className={`block py-2 px-3 rounded-md text-sm hover:bg-accent transition-colors ${activeSection === 'l402' ? 'bg-accent font-medium' : ''}`}
                >
                  L402 Payments
                </a>
                <a 
                  href="#setup-api" 
                  className={`block py-2 px-3 rounded-md text-sm hover:bg-accent transition-colors ${activeSection === 'setup-api' ? 'bg-accent font-medium' : ''}`}
                >
                  Setting Up Your Paid API
                </a>
                <a 
                  href="#tools" 
                  className={`block py-2 px-3 rounded-md text-sm hover:bg-accent transition-colors ${activeSection === 'tools' ? 'bg-accent font-medium' : ''}`}
                >
                  Tools & Setup
                </a>
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <p className="text-lg text-muted-foreground mb-6">
              Learn how to discover, interact with, and pay for APIs in the 402.markets ecosystem using Nostr protocol and Lightning Network payments.
            </p>

            {/* Add warning that its work in progress */}
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">  
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">Work in Progress</h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    These docs are a work in progress. There might be some mistakes or missing information.
                  </p>
                </div>
              </div>
            </div>
            {/* API Discovery Section */}
            <section id="discovery" ref={discoveryRef} className="mb-24 border-b pb-24 scroll-mt-8">
              <h2 className="text-2xl font-semibold mb-8">API Discovery</h2>
              <div className="flex gap-8">
                {/* Description - LONG */}
                <div className="w-1/2" ref={discoveryLeftRef}>
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-muted-foreground mb-4">
                      APIs in the 402.markets ecosystem are stored as Nostr events with <code className="bg-muted px-1 py-0.5 rounded text-sm">kind: 30078</code> and tagged with <code className="bg-muted px-1 py-0.5 rounded text-sm">t: 402.markets</code>. Use the <code className="bg-muted px-1 py-0.5 rounded text-sm">d</code> tag to identify specific APIs.
                    </p>
                    
                    <h3 className="text-xl font-semibold mb-4">Event Structure</h3>
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-semibold">Field</th>
                            <th className="text-left py-2 px-3 font-semibold">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">kind: 30078</code></td>
                            <td className="py-2 px-3">API marketplace event type</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">t: 402.markets</code></td>
                            <td className="py-2 px-3">Application tag</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">d: &lt;api-id&gt;</code></td>
                            <td className="py-2 px-3">Unique API identifier</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">content</code></td>
                            <td className="py-2 px-3">OpenAPI 3.0 specification</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Pro Tip</h4>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Use multiple relays for better coverage. The 402.markets website queries several relays to ensure comprehensive API discovery.
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-muted-foreground mb-4">
                      The discovery process involves querying Nostr relays for events with the specific kind and tags. This allows for decentralized API discovery without relying on a central registry.
                    </p>

                    <h3 className="text-xl font-semibold mb-4">Query Parameters</h3>
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-semibold">Parameter</th>
                            <th className="text-left py-2 px-3 font-semibold">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">kinds: [30078]</code></td>
                            <td className="py-2 px-3">Filter by event kind</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">#t: ['402.markets']</code></td>
                            <td className="py-2 px-3">Filter by application tag</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">#d: ['api-id']</code></td>
                            <td className="py-2 px-3">Filter by specific API ID</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">authors: ['pubkey']</code></td>
                            <td className="py-2 px-3">Filter by author</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="text-muted-foreground">
                      The decentralized nature of Nostr means APIs can be discovered from any relay that carries the events. This creates a resilient ecosystem where API availability doesn't depend on a single point of failure.
                    </p>
                  </div>
                </div>

                {/* Code - SHORT (should stick) */}
                <div className="w-1/2" ref={discoveryRightRef}>
                  <div className="sticky top-8 rounded-lg">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">API Discovery Examples</h3>
                          <button 
                            onClick={() => navigator.clipboard.writeText(codeExamples.discovery[selectedTool])}
                            className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded"
                          >
                            Copy
                          </button>
                        </div>
                        
                        <div className="mb-4">
                          <div className="relative inline-block">
                            <select
                              value={selectedTool}
                              onChange={(e) => setSelectedTool(e.target.value as 'nak' | 'ndk')}
                              className="appearance-none bg-background border border-border rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="nak">NAK CLI</option>
                              <option value="ndk">NDK Library</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                        
                        <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words">
                          <code>{codeExamples.discovery[selectedTool]}</code>
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </section>

            {/* Reactions Section */}
            <section id="reactions" ref={reactionsRef} className="mb-24 border-b pb-24 scroll-mt-8">
              <h2 className="text-2xl font-semibold mb-8">Getting Reactions</h2>
              <div className="flex gap-8">
                {/* Description - LONG */}
                <div className="w-1/2" ref={reactionsLeftRef}>
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-muted-foreground mb-4">
                      Reactions in Nostr are events with <code className="bg-muted px-1 py-0.5 rounded text-sm">kind: 7</code> that reference other events using the <code className="bg-muted px-1 py-0.5 rounded text-sm">e</code> tag. This allows users to like, dislike, or react with emojis to API listings.
                    </p>

                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">Reaction Types</h4>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            Reactions can contain any emoji or text. Common reactions include ❤️, 👍, 🔥, and custom emojis. The content field contains the reaction emoji.
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-muted-foreground mb-4">
                      You can query reactions by event ID to see all reactions for a specific API, or filter by author to see reactions from specific users.
                    </p>

                    <h3 className="text-xl font-semibold mb-4">Reaction Event Structure</h3>
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-semibold">Field</th>
                            <th className="text-left py-2 px-3 font-semibold">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">kind: 7</code></td>
                            <td className="py-2 px-3">Reaction event type</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">#e: ['event-id']</code></td>
                            <td className="py-2 px-3">Referenced event ID</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">content</code></td>
                            <td className="py-2 px-3">Reaction emoji or text</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">pubkey</code></td>
                            <td className="py-2 px-3">Author of the reaction</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="text-muted-foreground mb-4">
                      The reaction system enables community feedback on API quality and usefulness. Users can express their satisfaction or concerns about specific APIs through various emoji reactions.
                    </p>

                    <h3 className="text-xl font-semibold mb-4">Query Examples</h3>
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-semibold">Parameter</th>
                            <th className="text-left py-2 px-3 font-semibold">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">#e: ['api-event-id']</code></td>
                            <td className="py-2 px-3">All reactions for specific API</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">authors: ['user-pubkey']</code></td>
                            <td className="py-2 px-3">Reactions by specific user</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">since: timestamp</code></td>
                            <td className="py-2 px-3">Reactions after timestamp</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3"><code className="bg-muted px-1 py-0.5 rounded">until: timestamp</code></td>
                            <td className="py-2 px-3">Reactions before timestamp</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="text-muted-foreground">
                      The decentralized nature of reactions means they can be aggregated from multiple relays, providing a comprehensive view of community sentiment about each API.
                    </p>
                  </div>
                </div>

                {/* Code - SHORT (should stick) */}
                <div className="w-1/2" ref={reactionsRightRef}>
                  <div className="sticky top-8 rounded-lg">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">Reactions Examples</h3>
                          <button 
                            onClick={() => navigator.clipboard.writeText(codeExamples.reactions[selectedTool])}
                            className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded"
                          >
                            Copy
                          </button>
                        </div>
                        
                        <div className="mb-4">
                          <div className="relative inline-block">
                            <select
                              value={selectedTool}
                              onChange={(e) => setSelectedTool(e.target.value as 'nak' | 'ndk')}
                              className="appearance-none bg-background border border-border rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <option value="nak">NAK CLI</option>
                              <option value="ndk">NDK Library</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                        
                        <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words">
                          <code>{codeExamples.reactions[selectedTool]}</code>
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </section>

            {/* P2PK Section */}
            <section id="p2pk" ref={p2pkRef} className="mb-24 border-b pb-24 scroll-mt-8">
              <h2 className="text-2xl font-semibold mb-8">P2PK Payments</h2>
              <div className="flex gap-8">
                {/* Description - LONG */}
                <div className="w-1/2" ref={p2pkLeftRef}>
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-muted-foreground mb-4">
                      P2PK (Pay to Public Key) payments use Cashu tokens locked to a specific public key. When an API returns a 402 status with an <code className="bg-muted px-1 py-0.5 rounded text-sm">X-Cashu</code> header containing a base64-encoded payment request, you can create a P2PK-locked token for payment.
                    </p>

                    <h3 className="text-xl font-semibold mb-4">Payment Flow</h3>
                    <ol className="text-sm space-y-1 list-decimal list-inside mb-4">
                      <li>
                        <strong>Make initial API request</strong> - The API will return a 402 Payment Required status with an <code className="bg-muted px-1 py-0.5 rounded">X-Cashu</code> header containing a base64-encoded payment request. This header indicates P2PK payment support.
                        
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
{`HTTP/2 402
x-cashu: creqA...`}
                          </pre>
                        </div>
                      </li>
                      <li>Receive 402 response with <code className="bg-muted px-1 py-0.5 rounded">X-Cashu</code> header</li>
                      <li>Decode base64 payment request to get amount, pubkey, and mint info</li>
                      <li>Create P2PK-locked Cashu token with proofs containing <code className="bg-muted px-1 py-0.5 rounded">["P2PK", {"{"}data{"}"}: "pubkey"]</code> secrets</li>
                      <li>
                        Retry request with <code className="bg-muted px-1 py-0.5 rounded">Authorization: Cashu &lt;token&gt;</code>
                        
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
{`GET /api/hello HTTP/1.1
Host: api.example.com
Authorization: Cashu cashuA...
Content-Type: application/json`}
                          </pre>
                        </div>
                      </li>
                    </ol>

                    <p className="text-muted-foreground mb-4">
                      This payment method is fast, private, and doesn't require Lightning Network channels. The P2PK locking ensures only the holder of the private key can spend the tokens.
                    </p>

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Payment Method Detection</h4>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            APIs automatically indicate supported payment methods through response headers. The presence of an <code className="bg-muted px-1 py-0.5 rounded">X-Cashu</code> header indicates P2PK support, while <code className="bg-muted px-1 py-0.5 rounded">WWW-Authenticate</code> indicates L402 support.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Reference</h4>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            For the complete Cashu token specification, see the{' '}
                            <a 
                              href="https://github.com/cashubtc/nuts/blob/main/00.md#v4-tokens" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:no-underline font-mono"
                            >
                              NUT-0 v4 tokens specification
                            </a>
                            {' '}on GitHub.
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Code - SHORT (should stick) */}
                <div className="w-1/2" ref={p2pkRightRef}>
                  <div className="sticky top-8 rounded-lg">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">P2PK Payment Example</h3>
                          <button 
                            onClick={() => navigator.clipboard.writeText(codeExamples.p2pk)}
                            className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded"
                          >
                            Copy
                          </button>
                        </div>
                        
                        <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words">
                          <code>{codeExamples.p2pk}</code>
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </section>

            {/* L402 Section */}
            <section id="l402" ref={l402Ref} className="mb-24 border-b pb-24 scroll-mt-8">
              <h2 className="text-2xl font-semibold mb-8">L402 Payments</h2>
              <div className="flex gap-8">
                {/* Description - LONG */}
                <div className="w-1/2" ref={l402LeftRef}>
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-muted-foreground mb-4">
                      L402 combines Lightning Network payments with Macaroons for secure, pay-per-request API access. The API returns a 402 status with a <code className="bg-muted px-1 py-0.5 rounded text-sm">WWW-Authenticate</code> header containing a Lightning invoice and Macaroon.
                    </p>

                    <h3 className="text-xl font-semibold mb-4">Payment Flow</h3>
                    <ol className="text-sm space-y-1 list-decimal list-inside mb-4">
                      <li>
                        <strong>Make initial API request</strong> - The API will return a 402 Payment Required status with a <code className="bg-muted px-1 py-0.5 rounded">WWW-Authenticate</code> header containing a Lightning invoice and Macaroon. This header indicates L402 payment support.
                        
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
{`HTTP/2 402
www-authenticate: L402 macaroon="MDAxMmxvY2F0aW9uIEw0MDIK...", invoice="lnbc50n1p508llqpp58ss9dhj0ldhvvdr34tqp2dp..."`}
                          </pre>
                        </div>
                      </li>
                      <li>Receive 402 response with <code className="bg-muted px-1 py-0.5 rounded">WWW-Authenticate</code> header</li>
                      <li>Parse <code className="bg-muted px-1 py-0.5 rounded">L402 macaroon="...", invoice="..."</code> format</li>
                      <li>Pay the Lightning invoice using your Lightning wallet</li>
                      <li>
                        Retry request with <code className="bg-muted px-1 py-0.5 rounded">Authorization: L402 &lt;macaroon&gt;:&lt;preimage&gt;</code>
                        
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
{`GET /api/hello HTTP/1.1
Host: api.example.com
Authorization: L402 <macaroon>:<preimage>
Content-Type: application/json`}
                          </pre>
                        </div>
                      </li>
                    </ol>

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Payment Method Detection</h4>
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            APIs automatically indicate supported payment methods through response headers. The presence of a <code className="bg-muted px-1 py-0.5 rounded">WWW-Authenticate</code> header indicates L402 support, while <code className="bg-muted px-1 py-0.5 rounded">X-Cashu</code> indicates P2PK support.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">Note</h4>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            L402 requires a Lightning wallet capable of paying invoices. The example shows using Cashu to pay the Lightning invoice.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Code - SHORT (should stick) */}
                <div className="w-1/2" ref={l402RightRef}>
                  <div className="sticky top-8 rounded-lg">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">L402 Payment Example</h3>
                          <button 
                            onClick={() => navigator.clipboard.writeText(codeExamples.l402)}
                            className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded"
                          >
                            Copy
                          </button>
                        </div>
                        
                        <pre className="text-xs bg-muted p-4 rounded overflow-x-auto max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words">
                          <code>{codeExamples.l402}</code>
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </section>

            {/* Setting Up Your Paid API Section */}
            <section id="setup-api" ref={setupApiRef} className="mb-24 border-b pb-24 scroll-mt-8">
              <h2 className="text-2xl font-semibold mb-8">Setting Up Your Paid API</h2>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-6">
                  Learn how to monetize your API using the L402 Nginx module. This comprehensive guide covers everything from installation to configuration for Lightning Network and Cashu payments.
                </p>

                <h3 className="text-xl font-semibold mb-4">1. Installation</h3>
                <div className="bg-muted/50 p-4 rounded-lg mb-6">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words"><code>{`# Download the L402 Nginx module
wget https://github.com/DhananjayPurohit/ngx_l402/releases/latest/download/libngx_l402_lib.so
sudo cp libngx_l402_lib.so /etc/nginx/modules/

# Enable the module in nginx.conf
echo 'load_module /etc/nginx/modules/libngx_l402_lib.so;' | sudo tee -a /etc/nginx/nginx.conf`}</code></pre>
                </div>

                <h3 className="text-xl font-semibold mb-4">2. Nginx Configuration</h3>
                <div className="bg-muted/50 p-4 rounded-lg mb-6">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words"><code>{`location /api {
    root   /usr/share/nginx/html;
    index  index.html index.htm;
    
    # Enable L402 authentication
    l402 on;
    l402_amount_msat_default    10000;  # 10 sats per request
    l402_macaroon_timeout 3600;         # 1 hour validity
    
    # Your API logic here
    proxy_pass http://my-api-server;
}`}</code></pre>
                </div>

                <h3 className="text-xl font-semibold mb-4">3. Lightning Network Setup</h3>
                
                <h4 className="text-lg font-semibold mb-3">LND Configuration</h4>
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words"><code>{`# LND Environment Variables
LN_CLIENT_TYPE=LND
LND_ADDRESS=https://your-lnd-server.com
MACAROON_FILE_PATH=/path/to/macaroon
CERT_FILE_PATH=/path/to/cert
ROOT_KEY=$(openssl rand -hex 32)`}</code></pre>
                </div>

                <h4 className="text-lg font-semibold mb-3">CLN Configuration</h4>
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words"><code>{`# CLN Environment Variables
LN_CLIENT_TYPE=CLN
CLN_LIGHTNING_RPC_FILE_PATH=/path/to/lightning-rpc
ROOT_KEY=$(openssl rand -hex 32)`}</code></pre>
                </div>

                <h4 className="text-lg font-semibold mb-3">LNURL Configuration</h4>
                <div className="bg-muted/50 p-4 rounded-lg mb-6">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words"><code>{`# LNURL Environment Variables
LN_CLIENT_TYPE=LNURL
LNURL_ADDRESS=me@npubx.cash
ROOT_KEY=$(openssl rand -hex 32)`}</code></pre>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Get Your LNURL Address</h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        You can get a free LNURL address at <a href="https://npub.cash" className="underline hover:no-underline text-blue-600">https://npub.cash</a>. This service provides Lightning Network URL addresses that work with the L402 module for easy API monetization.
                      </p>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-semibold mb-4">4. Cashu eCash Support</h3>
                
                <h4 className="text-lg font-semibold mb-3">Standard Cashu Mode</h4>
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words"><code>{`# Standard Cashu Configuration
CASHU_ECASH_SUPPORT=true
CASHU_DB_PATH=/var/lib/nginx/cashu_tokens.db
CASHU_WALLET_SECRET=$(openssl rand -hex 32)
CASHU_WHITELISTED_MINTS=https://mint1.example.com,https://mint2.example.com
CASHU_REDEEM_ON_LIGHTNING=true`}</code></pre>
                </div>

                <h4 className="text-lg font-semibold mb-3">P2PK Mode (High Performance)</h4>
                <div className="bg-muted/50 p-4 rounded-lg mb-6">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words"><code>{`# P2PK Mode Configuration (High Performance)
CASHU_P2PK_MODE=true
CASHU_P2PK_PRIVATE_KEY=$(openssl rand -hex 32)
CASHU_WHITELISTED_MINTS=https://mint1.example.com,https://mint2.example.com
CASHU_MELT_MIN_BALANCE_SATS=10
CASHU_MELT_FEE_RESERVE_PERCENT=1`}</code></pre>
                </div>

                <h3 className="text-xl font-semibold mb-4">5. Dynamic Pricing with Redis</h3>
                <div className="bg-muted/50 p-4 rounded-lg mb-6">
                  <pre className="text-sm overflow-x-auto whitespace-pre-wrap break-words"><code>{`# Redis Configuration for Dynamic Pricing
REDIS_URL=redis://127.0.0.1:6379

# Set prices dynamically
redis-cli SET "/api/users" 5000    # 5 sats for /api/users
redis-cli SET "/api/data" 15000    # 15 sats for /api/data
redis-cli SET "/api/premium" 50000 # 50 sats for /api/premium`}</code></pre>
                </div>
              </div>
            </section>

            {/* Tools & Setup Section */}
            <section id="tools" ref={toolsRef} className="mb-24 scroll-mt-8">
              <div className="prose prose-slate dark:prose-invert max-w-none">





                <h3 className="text-xl font-semibold mb-6">Additional Resources</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {/* NAK CLI Card */}
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg mr-3">
                          <Terminal className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h4 className="font-semibold text-lg">NAK CLI</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        Command-line tool for interacting with Nostr relays. Similar to curl but for Nostr events. 
                        Perfect for testing API discovery and reactions.
                      </p>
                      <a 
                        href="https://github.com/fiatjaf/nak" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center">
                          <Github className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-mono">fiatjaf/nak</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-gray-500" />
                      </a>
                    </CardContent>
                  </Card>

                  {/* Nostr Extensions Card */}
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg mr-3">
                          <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h4 className="font-semibold text-lg">Nostr Extensions</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        Browser extensions for signing Nostr events. Required for publishing APIs and reactions.
                      </p>
                      <div className="space-y-3">
                        <a 
                          href="https://getalby.com/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-sm font-medium">Alby</span>
                          <ExternalLink className="w-3 h-3 text-gray-500" />
                        </a>
                        <a 
                          href="https://github.com/fiatjaf/nos2x" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-sm font-medium">nos2x</span>
                          <ExternalLink className="w-3 h-3 text-gray-500" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cashu Libraries Card */}
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg mr-3">
                          <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h4 className="font-semibold text-lg">Cashu Libraries</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        JavaScript/TypeScript libraries for Cashu token operations. Essential for P2PK and L402 payments.
                      </p>
                      <div className="space-y-3">
                        <a 
                          href="https://www.npmjs.com/package/@cashu/cashu-ts" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center">
                            <span className="text-sm font-mono">@cashu/cashu-ts</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-500" />
                        </a>
                        <div className="text-xs text-muted-foreground">
                          Main Cashu implementation for JavaScript/TypeScript
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* NDK Libraries Card */}
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg mr-3">
                          <Code className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h4 className="font-semibold text-lg">NDK Libraries</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        Nostr Development Kit for JavaScript/TypeScript. Includes hooks and utilities for React applications.
                      </p>
                      <div className="space-y-3">
                        <a 
                          href="https://www.npmjs.com/package/@ndk/nostr-development-kit" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center">
                            <span className="text-sm font-mono">@ndk/nostr-development-kit</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-500" />
                        </a>
                        <a 
                          href="https://www.npmjs.com/package/@nostr-dev-kit/ndk-hooks" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center">
                            <span className="text-sm font-mono">@nostr-dev-kit/ndk-hooks</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-500" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>

                  {/* L402 Nginx Module Card */}
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg mr-3">
                          <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <h4 className="font-semibold text-lg">L402 Nginx Module</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        Nginx module for implementing L402 payments on your API. Supports both Lightning and Cashu payments.
                      </p>
                      <a 
                        href="https://github.com/DhananjayPurohit/ngx_l402" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center">
                          <Github className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-mono">ngx_l402</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-gray-500" />
                      </a>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </section>
            
          </div>
        </div>
      </div>
    </div>
  )
}
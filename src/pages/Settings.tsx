import { useState, useEffect, useMemo } from "react"
import { AppHeader } from "@/components/app-header"
import { LoginModal } from "@/components/login-modal"
import { DeployFooter } from "@/components/deploy-footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { LogIn, Zap, Coins, Key, Trash2, Plus, CheckCircle2, XCircle } from "lucide-react"
import type { NostrUser } from "@/lib/types"

interface LightningSettings {
  clientType: "LNURL" | "LND" | "CLN" | "NWC"
  lnurlAddress: string
  connectionStatus: "connected" | "disconnected" | "error"
  lastInvoice?: string
}

interface CashuSettings {
  enabled: boolean
  whitelistedMints: Array<{
    url: string
    status: "active" | "error"
  }>
  redeemOnLightning: boolean
  redemptionInterval: number
  p2pkEnabled: boolean
  p2pkSource: "nostr" | "custom"
  customPrivateKey?: string
}

export default function Settings() {
  const [user, setUser] = useState<NostrUser | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [lightningSettings, setLightningSettings] = useState<LightningSettings>({
    clientType: "LNURL",
    lnurlAddress: "",
    connectionStatus: "disconnected"
  })
  const [cashuSettings, setCashuSettings] = useState<CashuSettings>({
    enabled: true,
    whitelistedMints: [
      { url: "https://mint.minibits.cash/Bitcoin", status: "active" },
      { url: "https://mint.coinos.io", status: "active" }
    ],
    redeemOnLightning: true,
    redemptionInterval: 3600,
    p2pkEnabled: true,
    p2pkSource: "nostr"
  })
  const [newMintUrl, setNewMintUrl] = useState("")
  
  // Track original settings for change detection
  const [originalLightningSettings, setOriginalLightningSettings] = useState<LightningSettings>({
    clientType: "LNURL",
    lnurlAddress: "",
    connectionStatus: "disconnected"
  })
  const [originalCashuSettings, setOriginalCashuSettings] = useState<CashuSettings>({
    enabled: true,
    whitelistedMints: [
      { url: "https://mint.minibits.cash/Bitcoin", status: "active" },
      { url: "https://mint.coinos.io", status: "active" }
    ],
    redeemOnLightning: true,
    redemptionInterval: 3600,
    p2pkEnabled: true,
    p2pkSource: "nostr"
  })
  const [isDeploying, setIsDeploying] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem("nostr_user")
    let parsedUser = null
    if (storedUser) {
      try {
        parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
      } catch (error) {
        console.error("Failed to parse stored user:", error)
      }
    }

    // Load settings from localStorage
    const storedLightning = localStorage.getItem("lightning_settings")
    if (storedLightning) {
      try {
        const parsed = JSON.parse(storedLightning)
        setLightningSettings(parsed)
        setOriginalLightningSettings(parsed)
      } catch (error) {
        console.error("Failed to parse lightning settings:", error)
      }
    } else if (parsedUser?.npub) {
      // Set default LNURL address if not already configured
      const defaultSettings = {
        clientType: "LNURL" as const,
        lnurlAddress: `${parsedUser.npub}@npubx.cash`,
        connectionStatus: "disconnected" as const
      }
      setLightningSettings(defaultSettings)
      setOriginalLightningSettings(defaultSettings)
    }

    const storedCashu = localStorage.getItem("cashu_settings")
    if (storedCashu) {
      try {
        const parsed = JSON.parse(storedCashu)
        setCashuSettings(parsed)
        setOriginalCashuSettings(parsed)
      } catch (error) {
        console.error("Failed to parse cashu settings:", error)
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

  const saveLightningSettings = () => {
    localStorage.setItem("lightning_settings", JSON.stringify(lightningSettings))
    setOriginalLightningSettings(lightningSettings)
  }

  const saveCashuSettings = () => {
    localStorage.setItem("cashu_settings", JSON.stringify(cashuSettings))
    setOriginalCashuSettings(cashuSettings)
  }
  
  // Deploy all changes
  const handleDeploy = async () => {
    setIsDeploying(true)
    try {
      // Save all settings
      saveLightningSettings()
      saveCashuSettings()
      
      // TODO: Send to backend/nginx config
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      alert("Settings deployed successfully!")
    } catch (error) {
      console.error("Deploy failed:", error)
      alert("Failed to deploy settings")
    } finally {
      setIsDeploying(false)
    }
  }
  
  // Discard all changes
  const handleDiscard = () => {
    setLightningSettings(originalLightningSettings)
    setCashuSettings(originalCashuSettings)
  }

  const testLightningConnection = async () => {
    // TODO: Implement actual connection test
    setLightningSettings(prev => ({
      ...prev,
      connectionStatus: "connected",
      lastInvoice: new Date().toISOString()
    }))
    alert("Lightning connection test successful!")
  }

  const addMint = () => {
    if (!newMintUrl.trim()) return
    
    setCashuSettings(prev => ({
      ...prev,
      whitelistedMints: [
        ...prev.whitelistedMints,
        { url: newMintUrl.trim(), status: "active" }
      ]
    }))
    setNewMintUrl("")
  }

  const removeMint = (index: number) => {
    setCashuSettings(prev => ({
      ...prev,
      whitelistedMints: prev.whitelistedMints.filter((_, i) => i !== index)
    }))
  }

  const testMint = async (mintUrl: string) => {
    // TODO: Implement actual mint test
    alert(`Testing connection to ${mintUrl}...`)
  }
  
  // Detect changes
  const changes = useMemo(() => {
    const changeList: Array<{ field: string; description: string }> = []
    
    // Lightning changes
    if (lightningSettings.clientType !== originalLightningSettings.clientType) {
      changeList.push({
        field: "Lightning Client",
        description: `Changed from ${originalLightningSettings.clientType} to ${lightningSettings.clientType}`
      })
    }
    if (lightningSettings.lnurlAddress !== originalLightningSettings.lnurlAddress) {
      changeList.push({
        field: "LNURL Address",
        description: lightningSettings.lnurlAddress ? `Set to ${lightningSettings.lnurlAddress}` : "Cleared"
      })
    }
    
    // Cashu changes
    if (cashuSettings.enabled !== originalCashuSettings.enabled) {
      changeList.push({
        field: "Cashu Support",
        description: cashuSettings.enabled ? "Enabled" : "Disabled"
      })
    }
    if (cashuSettings.whitelistedMints.length !== originalCashuSettings.whitelistedMints.length) {
      const diff = cashuSettings.whitelistedMints.length - originalCashuSettings.whitelistedMints.length
      changeList.push({
        field: "Mints",
        description: diff > 0 ? `Added ${diff} mint${diff > 1 ? 's' : ''}` : `Removed ${Math.abs(diff)} mint${Math.abs(diff) > 1 ? 's' : ''}`
      })
    }
    if (cashuSettings.redeemOnLightning !== originalCashuSettings.redeemOnLightning) {
      changeList.push({
        field: "Auto-Redeem",
        description: cashuSettings.redeemOnLightning ? "Enabled" : "Disabled"
      })
    }
    if (cashuSettings.redemptionInterval !== originalCashuSettings.redemptionInterval) {
      changeList.push({
        field: "Redemption Interval",
        description: `Changed to ${cashuSettings.redemptionInterval}s`
      })
    }
    if (cashuSettings.p2pkEnabled !== originalCashuSettings.p2pkEnabled) {
      changeList.push({
        field: "P2PK Mode",
        description: cashuSettings.p2pkEnabled ? "Enabled" : "Disabled"
      })
    }
    if (cashuSettings.p2pkSource !== originalCashuSettings.p2pkSource) {
      changeList.push({
        field: "P2PK Key Source",
        description: `Changed to ${cashuSettings.p2pkSource}`
      })
    }
    
    return changeList
  }, [lightningSettings, originalLightningSettings, cashuSettings, originalCashuSettings])

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader
          user={null}
          currentPage="settings"
          onLoginClick={() => setShowLoginModal(true)}
          onLogout={handleLogout}
        />

        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-mono font-bold mb-4">Settings</h2>
            <p className="text-muted-foreground font-mono mb-6">Please log in to manage your settings</p>
            <Button onClick={() => setShowLoginModal(true)}>
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </Button>
          </div>
        </div>

        <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} onLoginSuccess={handleLoginSuccess} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        user={user}
        currentPage="settings"
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} onLoginSuccess={handleLoginSuccess} />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold font-mono mb-8">Settings</h1>

        <Tabs defaultValue="lightning" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lightning" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Lightning</span>
            </TabsTrigger>
            <TabsTrigger value="cashu" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">Cashu</span>
            </TabsTrigger>
            <TabsTrigger value="nostr" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Nostr</span>
            </TabsTrigger>
          </TabsList>

          {/* Lightning Settings */}
          <TabsContent value="lightning" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-mono">Lightning Network Settings</CardTitle>
                <CardDescription>
                  Configure your Lightning Network connection for receiving payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="client-type" className="font-mono">Client Type</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                      {["LNURL", "LND", "CLN", "NWC"].map((type) => (
                        <Button
                          key={type}
                          variant={lightningSettings.clientType === type ? "default" : "outline"}
                          onClick={() => setLightningSettings(prev => ({ ...prev, clientType: type as any }))}
                          className="font-mono"
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="lnurl-address" className="font-mono">LNURL Address</Label>
                    <Input
                      id="lnurl-address"
                      type="text"
                      placeholder={user?.npub ? `${user.npub}@npubx.cash` : "npub...@npubx.cash"}
                      value={lightningSettings.lnurlAddress}
                      onChange={(e) => setLightningSettings(prev => ({ ...prev, lnurlAddress: e.target.value }))}
                      className="mt-2 font-mono"
                    />
                    {user?.npub && !lightningSettings.lnurlAddress && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Default: {user.npub}@npubx.cash
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="font-mono">Connection Status:</Label>
                    <Badge
                      variant={
                        lightningSettings.connectionStatus === "connected" ? "default" :
                        lightningSettings.connectionStatus === "error" ? "destructive" : "secondary"
                      }
                      className="flex items-center gap-1"
                    >
                      {lightningSettings.connectionStatus === "connected" ? (
                        <><CheckCircle2 className="h-3 w-3" /> Connected</>
                      ) : lightningSettings.connectionStatus === "error" ? (
                        <><XCircle className="h-3 w-3" /> Error</>
                      ) : (
                        "Disconnected"
                      )}
                    </Badge>
                  </div>

                  {lightningSettings.lastInvoice && (
                    <div>
                      <Label className="font-mono text-xs text-muted-foreground">
                        Last Invoice: {new Date(lightningSettings.lastInvoice).toLocaleString()}
                      </Label>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button onClick={testLightningConnection} variant="outline">
                      Test Connection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cashu Settings */}
          <TabsContent value="cashu" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-mono">Cashu Ecash Settings</CardTitle>
                <CardDescription>
                  Configure Cashu ecash support for offline and privacy-preserving payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-mono">Enable Cashu Support</Label>
                    <p className="text-sm text-muted-foreground">Accept Cashu ecash tokens as payment</p>
                  </div>
                  <Button
                    variant={cashuSettings.enabled ? "default" : "outline"}
                    onClick={() => setCashuSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                  >
                    {cashuSettings.enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>

                {cashuSettings.enabled && (
                  <>
                    <div className="space-y-3">
                      <Label className="font-mono">Whitelisted Mints</Label>
                      <div className="space-y-2">
                        {cashuSettings.whitelistedMints.map((mint, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                            <Badge variant={mint.status === "active" ? "default" : "destructive"}>
                              {mint.status === "active" ? "🟢" : "🔴"}
                            </Badge>
                            <span className="flex-1 text-sm font-mono break-all">{mint.url}</span>
                            <Button size="sm" variant="outline" onClick={() => testMint(mint.url)}>
                              Test
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeMint(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="https://mint.example.com"
                          value={newMintUrl}
                          onChange={(e) => setNewMintUrl(e.target.value)}
                          className="font-mono"
                        />
                        <Button onClick={addMint} variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Mint
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="font-mono">Redeem on Lightning Network</Label>
                          <p className="text-sm text-muted-foreground">Automatically redeem received ecash</p>
                        </div>
                        <Button
                          variant={cashuSettings.redeemOnLightning ? "default" : "outline"}
                          onClick={() => setCashuSettings(prev => ({ ...prev, redeemOnLightning: !prev.redeemOnLightning }))}
                        >
                          {cashuSettings.redeemOnLightning ? "Enabled" : "Disabled"}
                        </Button>
                      </div>

                      {cashuSettings.redeemOnLightning && (
                        <div>
                          <Label htmlFor="redemption-interval" className="font-mono">Redemption Interval (seconds)</Label>
                          <div className="flex gap-2 mt-2">
                            <Input
                              id="redemption-interval"
                              type="number"
                              value={cashuSettings.redemptionInterval}
                              onChange={(e) => setCashuSettings(prev => ({ ...prev, redemptionInterval: parseInt(e.target.value) }))}
                              className="font-mono"
                            />
                            <div className="flex gap-1">
                              {[900, 3600, 21600, 86400].map((seconds) => (
                                <Button
                                  key={seconds}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCashuSettings(prev => ({ ...prev, redemptionInterval: seconds }))}
                                  className="font-mono text-xs"
                                >
                                  {seconds === 900 ? "15m" : seconds === 3600 ? "1h" : seconds === 21600 ? "6h" : "24h"}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="font-mono">Enable P2PK Mode</Label>
                          <p className="text-sm text-muted-foreground">Require tokens locked to your key</p>
                        </div>
                        <Button
                          variant={cashuSettings.p2pkEnabled ? "default" : "outline"}
                          onClick={() => setCashuSettings(prev => ({ ...prev, p2pkEnabled: !prev.p2pkEnabled }))}
                        >
                          {cashuSettings.p2pkEnabled ? "Enabled" : "Disabled"}
                        </Button>
                      </div>

                      {cashuSettings.p2pkEnabled && (
                        <div>
                          <Label className="font-mono">Private Key Source</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            <Button
                              variant={cashuSettings.p2pkSource === "nostr" ? "default" : "outline"}
                              onClick={() => setCashuSettings(prev => ({ ...prev, p2pkSource: "nostr" }))}
                            >
                              Derive from Nostr (recommended)
                            </Button>
                            <Button
                              variant={cashuSettings.p2pkSource === "custom" ? "default" : "outline"}
                              onClick={() => setCashuSettings(prev => ({ ...prev, p2pkSource: "custom" }))}
                            >
                              Custom Private Key
                            </Button>
                          </div>

                          {cashuSettings.p2pkSource === "custom" && (
                            <Input
                              placeholder="Enter private key (hex)"
                              value={cashuSettings.customPrivateKey || ""}
                              onChange={(e) => setCashuSettings(prev => ({ ...prev, customPrivateKey: e.target.value }))}
                              className="mt-2 font-mono"
                              type="password"
                            />
                          )}
                        </div>
                      )}
                    </div>

                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nostr Settings */}
          <TabsContent value="nostr" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-mono">Nostr Identity</CardTitle>
                <CardDescription>
                  Your Nostr identity and authentication settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="font-mono">Public Key (npub)</Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                    {user.npub}
                  </div>
                </div>

                <div>
                  <Label className="font-mono">Your 402.markets subdomain</Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg font-mono text-sm break-all">
                    https://{user.npub.slice(0, 12)}...{user.npub.slice(-8)}.402.markets
                  </div>
                </div>

                {user.profile && (
                  <>
                    {user.profile.name && (
                      <div>
                        <Label className="font-mono">Display Name</Label>
                        <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                          {user.profile.name}
                        </div>
                      </div>
                    )}

                    {user.profile.nip05 && (
                      <div>
                        <Label className="font-mono">NIP-05 Verification</Label>
                        <div className="mt-2 p-3 bg-muted rounded-lg text-sm font-mono">
                          {user.profile.nip05}
                        </div>
                      </div>
                    )}

                    {user.profile.lud16 && (
                      <div>
                        <Label className="font-mono">Lightning Address</Label>
                        <div className="mt-2 p-3 bg-muted rounded-lg text-sm font-mono">
                          {user.profile.lud16}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <Alert>
                  <Key className="h-4 w-4" />
                  <div className="ml-2">
                    <p className="font-mono text-sm font-semibold">Authentication Method</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You're currently authenticated via browser extension or Nostr Connect
                    </p>
                  </div>
                </Alert>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowLoginModal(true)}>
                    Reconnect
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    Change Identity
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Add padding at bottom to prevent content being hidden by sticky footer */}
        <div className="h-24" />
      </div>
      
      {/* Deploy footer */}
      <DeployFooter
        changes={changes}
        onDeploy={handleDeploy}
        onDiscard={handleDiscard}
        isDeploying={isDeploying}
      />
    </div>
  )
}


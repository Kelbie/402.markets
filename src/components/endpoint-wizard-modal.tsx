import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DeployFooter } from "@/components/deploy-footer"
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react"

interface EndpointWizardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type EndpointMode = "proxy" | "static"

interface EndpointConfig {
  name: string
  path: string
  description: string
  mode: EndpointMode
  // Proxy mode
  targetUrl?: string
  proxyHeaders?: Record<string, string>
  hideCors?: boolean
  verifySsl?: boolean
  // Static mode
  contentType?: string
  responseBody?: string
  responseStatus?: number
  // Payment
  amountMsats: number
  timeoutSeconds: number
}

const PRESET_AMOUNTS = [1000, 5000, 10000, 21000] // in msats
const PRESET_TIMEOUTS = [3600, 86400, 604800, 2592000] // in seconds

export function EndpointWizardModal({ open, onOpenChange, onSuccess }: EndpointWizardModalProps) {
  const [step, setStep] = useState(1)
  const [isDeploying, setIsDeploying] = useState(false)
  const [config, setConfig] = useState<EndpointConfig>({
    name: "",
    path: "",
    description: "",
    mode: "proxy",
    amountMsats: 5000,
    timeoutSeconds: 3600,
    hideCors: true,
    verifySsl: true,
    contentType: "application/json",
    responseBody: '{\n  "message": "Hello World!"\n}',
    responseStatus: 200
  })
  
  const [originalConfig] = useState<EndpointConfig>({
    name: "",
    path: "",
    description: "",
    mode: "proxy",
    amountMsats: 5000,
    timeoutSeconds: 3600,
    hideCors: true,
    verifySsl: true,
    contentType: "application/json",
    responseBody: '{\n  "message": "Hello World!"\n}',
    responseStatus: 200
  })

  const totalSteps = config.mode === "proxy" ? 4 : 4

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleDeploy = async () => {
    setIsDeploying(true)
    try {
      // TODO: Implement actual deployment
      console.log("Deploying endpoint:", config)
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate deployment
      
      alert("Endpoint deployed successfully! (This is a demo)")
      onSuccess()
      onOpenChange(false)
      // Reset
      setStep(1)
      setConfig({
        name: "",
        path: "",
        description: "",
        mode: "proxy",
        amountMsats: 5000,
        timeoutSeconds: 3600,
        hideCors: true,
        verifySsl: true,
        contentType: "application/json",
        responseBody: '{\n  "message": "Hello World!"\n}',
        responseStatus: 200
      })
    } catch (error) {
      console.error("Deploy failed:", error)
      alert("Failed to deploy endpoint")
    } finally {
      setIsDeploying(false)
    }
  }
  
  const handleDiscard = () => {
    setConfig(originalConfig)
    setStep(1)
  }
  
  // Detect changes for deploy footer
  const changes = useMemo(() => {
    const changeList: Array<{ field: string; description: string }> = []
    
    if (config.name !== originalConfig.name && config.name) {
      changeList.push({ field: "Name", description: config.name })
    }
    if (config.path !== originalConfig.path && config.path) {
      changeList.push({ field: "Path", description: config.path })
    }
    if (config.mode !== originalConfig.mode) {
      changeList.push({ field: "Mode", description: config.mode === "proxy" ? "Proxy" : "Static Response" })
    }
    if (config.mode === "proxy" && config.targetUrl && config.targetUrl !== originalConfig.targetUrl) {
      changeList.push({ field: "Target URL", description: config.targetUrl })
    }
    if (config.amountMsats !== originalConfig.amountMsats) {
      changeList.push({ field: "Price", description: `${config.amountMsats / 1000} sats` })
    }
    if (config.timeoutSeconds !== originalConfig.timeoutSeconds) {
      changeList.push({ field: "Timeout", description: `${config.timeoutSeconds}s` })
    }
    
    return changeList
  }, [config, originalConfig])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pb-32">
        <DialogHeader>
          <DialogTitle className="font-mono">Create New Protected Endpoint</DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full ${
                index + 1 <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Basic Configuration */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="endpoint-name" className="font-mono">Endpoint Name *</Label>
              <Input
                id="endpoint-name"
                placeholder="e.g., Weather API, Dad Jokes"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="endpoint-path" className="font-mono">Endpoint Path *</Label>
              <Input
                id="endpoint-path"
                placeholder="e.g., /api/weather, /api/joke"
                value={config.path}
                onChange={(e) => setConfig({ ...config, path: e.target.value })}
                className="mt-2 font-mono"
              />
            </div>

            <div>
              <Label htmlFor="endpoint-description" className="font-mono">Description</Label>
              <Textarea
                id="endpoint-description"
                placeholder="Helps users discover your endpoint"
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                className="mt-2"
                rows={3}
              />
            </div>

            <div>
              <Label className="font-mono">Mode</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Button
                  type="button"
                  variant={config.mode === "proxy" ? "default" : "outline"}
                  onClick={() => setConfig({ ...config, mode: "proxy" })}
                  className="h-auto py-4 flex-col items-start"
                >
                  <span className="font-semibold">Proxy Mode</span>
                  <span className="text-xs mt-1 opacity-80">Forward requests to another API</span>
                </Button>
                <Button
                  type="button"
                  variant={config.mode === "static" ? "default" : "outline"}
                  onClick={() => setConfig({ ...config, mode: "static" })}
                  className="h-auto py-4 flex-col items-start"
                >
                  <span className="font-semibold">Static Response</span>
                  <span className="text-xs mt-1 opacity-80">Return a fixed response</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Mode Configuration */}
        {step === 2 && config.mode === "proxy" && (
          <div className="space-y-4">
            <h3 className="font-mono font-semibold text-lg">Proxy Configuration</h3>
            
            <div>
              <Label htmlFor="target-url" className="font-mono">Target URL *</Label>
              <Input
                id="target-url"
                placeholder="https://api.example.com/endpoint"
                value={config.targetUrl || ""}
                onChange={(e) => setConfig({ ...config, targetUrl: e.target.value })}
                className="mt-2 font-mono"
              />
            </div>

            <div className="space-y-3">
              <Label className="font-mono">Proxy Options</Label>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-mono text-sm font-semibold">Hide upstream CORS headers</p>
                  <p className="text-xs text-muted-foreground">Prevent CORS issues in browser</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={config.hideCors ? "default" : "outline"}
                  onClick={() => setConfig({ ...config, hideCors: !config.hideCors })}
                >
                  {config.hideCors ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-mono text-sm font-semibold">Enable SSL verification</p>
                  <p className="text-xs text-muted-foreground">Verify SSL certificates</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={config.verifySsl ? "default" : "outline"}
                  onClick={() => setConfig({ ...config, verifySsl: !config.verifySsl })}
                >
                  {config.verifySsl ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && config.mode === "static" && (
          <div className="space-y-4">
            <h3 className="font-mono font-semibold text-lg">Static Response Configuration</h3>
            
            <div>
              <Label htmlFor="content-type" className="font-mono">Content Type</Label>
              <select
                id="content-type"
                value={config.contentType}
                onChange={(e) => setConfig({ ...config, contentType: e.target.value })}
                className="mt-2 w-full px-3 py-2 border rounded-md font-mono text-sm"
              >
                <option value="application/json">application/json</option>
                <option value="text/plain">text/plain</option>
                <option value="text/html">text/html</option>
                <option value="application/xml">application/xml</option>
              </select>
            </div>

            <div>
              <Label htmlFor="response-body" className="font-mono">Response Body</Label>
              <Textarea
                id="response-body"
                value={config.responseBody}
                onChange={(e) => setConfig({ ...config, responseBody: e.target.value })}
                className="mt-2 font-mono text-sm"
                rows={8}
              />
            </div>

            <div>
              <Label htmlFor="response-status" className="font-mono">Response Status</Label>
              <select
                id="response-status"
                value={config.responseStatus}
                onChange={(e) => setConfig({ ...config, responseStatus: parseInt(e.target.value) })}
                className="mt-2 w-full px-3 py-2 border rounded-md font-mono text-sm"
              >
                <option value="200">200 OK</option>
                <option value="201">201 Created</option>
                <option value="202">202 Accepted</option>
                <option value="204">204 No Content</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Payment Configuration */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-mono font-semibold text-lg">L402 Payment Settings</h3>
            
            <div>
              <Label htmlFor="amount-msats" className="font-mono">Amount (millisats)</Label>
              <Input
                id="amount-msats"
                type="number"
                value={config.amountMsats}
                onChange={(e) => setConfig({ ...config, amountMsats: parseInt(e.target.value) || 0 })}
                className="mt-2 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                = {(config.amountMsats / 1000).toFixed(0)} sats ≈ ${((config.amountMsats / 1000) * 0.0004).toFixed(4)} USD
              </p>
              <div className="flex gap-2 mt-2">
                {PRESET_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfig({ ...config, amountMsats: amount })}
                    className="font-mono text-xs"
                  >
                    {amount / 1000} sat{amount / 1000 !== 1 ? 's' : ''}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="timeout-seconds" className="font-mono">Macaroon Timeout (seconds)</Label>
              <Input
                id="timeout-seconds"
                type="number"
                value={config.timeoutSeconds}
                onChange={(e) => setConfig({ ...config, timeoutSeconds: parseInt(e.target.value) || 0 })}
                className="mt-2 font-mono"
              />
              <div className="flex gap-2 mt-2">
                {PRESET_TIMEOUTS.map((seconds) => (
                  <Button
                    key={seconds}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfig({ ...config, timeoutSeconds: seconds })}
                    className="font-mono text-xs"
                  >
                    {seconds === 3600 ? "1hr" : seconds === 86400 ? "24hr" : seconds === 604800 ? "7days" : "30days"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Deploy */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-mono font-semibold text-lg">Review Configuration</h3>
            
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-mono">Your endpoint will be available at:</p>
                <p className="font-mono text-sm font-semibold break-all mt-1">
                  https://&lt;your-npub&gt;.402.markets{config.path || "/api/endpoint"}
                </p>
              </div>

              <div className="border-t pt-3">
                <p className="font-mono text-sm font-semibold mb-2">Configuration Summary:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Name: <span className="font-semibold">{config.name || "N/A"}</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Type: <Badge variant="secondary">{config.mode === "proxy" ? "Proxy" : "Static Response"}</Badge></span>
                  </div>
                  {config.mode === "proxy" && config.targetUrl && (
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>Target: <span className="font-mono text-xs">{config.targetUrl}</span></span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Price: <span className="font-semibold">{config.amountMsats / 1000} sats</span> per request</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Timeout: <span className="font-semibold">
                      {config.timeoutSeconds < 3600 ? `${config.timeoutSeconds / 60} minutes` :
                       config.timeoutSeconds < 86400 ? `${config.timeoutSeconds / 3600} hour${config.timeoutSeconds / 3600 !== 1 ? 's' : ''}` :
                       `${config.timeoutSeconds / 86400} day${config.timeoutSeconds / 86400 !== 1 ? 's' : ''}`}
                    </span></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-mono text-sm font-semibold">Ready to deploy!</p>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Your endpoint will be live immediately after deployment.
              </p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || isDeploying}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            {step < totalSteps ? (
              <Button type="button" onClick={handleNext} disabled={isDeploying}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : null}
          </div>
        </div>
        
        {/* Deploy footer - only show on final step */}
        {step === totalSteps && (
          <div className="absolute bottom-0 left-0 right-0">
            <DeployFooter
              changes={changes}
              onDeploy={handleDeploy}
              onDiscard={handleDiscard}
              isDeploying={isDeploying}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


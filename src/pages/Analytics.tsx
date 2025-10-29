import { useState, useEffect } from "react"
import { AppHeader } from "@/components/app-header"
import { LoginModal } from "@/components/login-modal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LogIn, TrendingUp, DollarSign, Users, Activity, Zap, Coins } from "lucide-react"
import type { NostrUser } from "@/lib/types"

interface AnalyticsData {
  totalRequests: number
  totalRevenue: number
  activeUsers: number
  requestsChange: number
  revenueChange: number
  usersChange: number
  topEndpoints: Array<{
    path: string
    revenue: number
    percentage: number
  }>
  paymentMethods: Array<{
    method: "Lightning" | "Cashu"
    count: number
    percentage: number
  }>
  recentTransactions: Array<{
    time: string
    endpoint: string
    amount: number
    method: "Lightning" | "Cashu"
  }>
}

export default function Analytics() {
  const [user, setUser] = useState<NostrUser | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d")
  
  // Mock analytics data
  const [analyticsData] = useState<AnalyticsData>({
    totalRequests: 1247,
    totalRevenue: 6235,
    activeUsers: 89,
    requestsChange: 12,
    revenueChange: 8,
    usersChange: 15,
    topEndpoints: [
      { path: "/api/nostr/search", revenue: 2450, percentage: 39 },
      { path: "/api/joke", revenue: 2100, percentage: 34 },
      { path: "/api/hello", revenue: 1685, percentage: 27 }
    ],
    paymentMethods: [
      { method: "Lightning", count: 847, percentage: 68 },
      { method: "Cashu", count: 400, percentage: 32 }
    ],
    recentTransactions: [
      { time: "2 min ago", endpoint: "/api/joke", amount: 5, method: "Lightning" },
      { time: "5 min ago", endpoint: "/api/hello", amount: 5, method: "Cashu" },
      { time: "8 min ago", endpoint: "/api/nostr/search", amount: 10, method: "Lightning" }
    ]
  })

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

  const exportCSV = () => {
    // TODO: Implement CSV export
    alert("Exporting analytics data to CSV...")
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader
          user={null}
          currentPage="analytics"
          onLoginClick={() => setShowLoginModal(true)}
          onLogout={handleLogout}
        />

        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-mono font-bold mb-4">Analytics</h2>
            <p className="text-muted-foreground font-mono mb-6">Please log in to view your analytics</p>
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
        currentPage="analytics"
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />

      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} onLoginSuccess={handleLoginSuccess} />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold font-mono">Analytics Overview</h1>
          
          <div className="flex gap-2">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                onClick={() => setTimeRange(range)}
                size="sm"
                className="font-mono"
              >
                Last {range === "7d" ? "7" : range === "30d" ? "30" : "90"} days
              </Button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono text-muted-foreground">Total Requests</span>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold font-mono mb-1">
                {analyticsData.totalRequests.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500 font-mono">+{analyticsData.requestsChange}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono text-muted-foreground">Total Revenue</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold font-mono mb-1">
                {analyticsData.totalRevenue.toLocaleString()} <span className="text-lg">sats</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500 font-mono">+{analyticsData.revenueChange}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono text-muted-foreground">Active Users</span>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold font-mono mb-1">
                {analyticsData.activeUsers}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500 font-mono">+{analyticsData.usersChange}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Over Time Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-mono">Requests Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2 pb-4">
              {/* Simple bar chart visualization */}
              {[35, 42, 38, 55, 48, 62, 58, 67, 71, 65, 78, 82, 76, 85, 80, 92, 88, 95, 91, 98, 94, 102, 97, 105, 100, 108, 103, 110, 106, 112].map((height, index) => (
                <div
                  key={index}
                  className="flex-1 bg-primary rounded-t transition-all hover:opacity-80"
                  style={{ height: `${height}%` }}
                  title={`Day ${index + 1}: ${Math.floor(height * 1.2)} requests`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground font-mono mt-2">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono">Top Endpoints by Revenue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analyticsData.topEndpoints.map((endpoint, index) => (
                <div key={endpoint.path}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        {index + 1}.
                      </span>
                      <span className="font-mono text-sm">{endpoint.path}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-semibold">{endpoint.revenue.toLocaleString()} sats</span>
                      <span className="text-muted-foreground text-sm ml-2">({endpoint.percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${endpoint.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analyticsData.paymentMethods.map((method) => (
                <div key={method.method}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {method.method === "Lightning" ? (
                        <Zap className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <Coins className="h-4 w-4 text-green-500" />
                      )}
                      <span className="font-mono text-sm">{method.method} Network</span>
                    </div>
                    <div>
                      <span className="font-mono font-semibold">{method.count} payments</span>
                      <span className="text-muted-foreground text-sm ml-2">({method.percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`rounded-full h-2 transition-all ${
                        method.method === "Lightning" ? "bg-yellow-500" : "bg-green-500"
                      }`}
                      style={{ width: `${method.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-mono">Recent Transactions</CardTitle>
            <CardDescription>Latest payment activity across your endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-mono text-sm font-semibold">Time</th>
                    <th className="text-left py-3 px-2 font-mono text-sm font-semibold">Endpoint</th>
                    <th className="text-right py-3 px-2 font-mono text-sm font-semibold">Amount</th>
                    <th className="text-center py-3 px-2 font-mono text-sm font-semibold">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.recentTransactions.map((tx, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 text-sm text-muted-foreground font-mono">{tx.time}</td>
                      <td className="py-3 px-2 text-sm font-mono">{tx.endpoint}</td>
                      <td className="py-3 px-2 text-sm text-right font-mono font-semibold">{tx.amount} sats</td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          variant={tx.method === "Lightning" ? "default" : "secondary"}
                          className="font-mono text-xs"
                        >
                          {tx.method === "Lightning" ? (
                            <><Zap className="h-3 w-3 mr-1" />Lightning</>
                          ) : (
                            <><Coins className="h-3 w-3 mr-1" />Cashu</>
                          )}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Export Actions */}
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline">
            Export CSV
          </Button>
          <Button variant="outline">
            View Detailed Report
          </Button>
        </div>
      </div>
    </div>
  )
}


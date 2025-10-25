import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Calendar,
  Shield,
} from "lucide-react";

interface DashboardOverviewProps {
  isRegistered: boolean;
  eligibility?: any;
}

export default function DashboardOverview({
  isRegistered,
  eligibility,
}: DashboardOverviewProps) {
  // Mock data - in real app, fetch from contract/backend
  const stats = {
    totalBets: 47,
    totalWagered: 1250.5,
    totalWon: 890.25,
    dailySpent: 45.0,
    dailyLimit: 200,
    monthlySpent: 820.0,
    monthlyLimit: 1000,
    winRate: 42,
    currentStreak: 3,
    accountAge: "14 days",
  };

  const dailyProgress = (stats.dailySpent / stats.dailyLimit) * 100;
  const monthlyProgress = (stats.monthlySpent / stats.monthlyLimit) * 100;
  const netProfit = stats.totalWon - stats.totalWagered;
  const isProfitable = netProfit > 0;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 border-0 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Welcome Back! 👋</h2>
              <p className="text-blue-100">
                {isRegistered
                  ? "Your account is active and verified"
                  : "Complete registration to start"}
              </p>
            </div>
            <div className="hidden md:block">
              <Badge
                variant="secondary"
                className="bg-white/20 text-white border-0 text-lg px-4 py-2"
              >
                {eligibility?.eligible
                  ? "✅ Eligible to Bet"
                  : "⚠️ Check Limits"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBets}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wagered</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalWagered.toFixed(2)} CCD
            </div>
            <p className="text-xs text-muted-foreground">
              Across all platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net P&L</CardTitle>
            {isProfitable ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                isProfitable ? "text-green-600" : "text-red-600"
              }`}
            >
              {isProfitable ? "+" : ""}
              {netProfit.toFixed(2)} CCD
            </div>
            <p className="text-xs text-muted-foreground">
              Win rate: {stats.winRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Streak
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentStreak} days</div>
            <p className="text-xs text-muted-foreground">
              Account age: {stats.accountAge}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Spending Limits */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Spending Limit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Spent Today</span>
              <span className="font-medium">
                {stats.dailySpent.toFixed(2)} / {stats.dailyLimit} CCD
              </span>
            </div>
            <Progress value={dailyProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {(stats.dailyLimit - stats.dailySpent).toFixed(2)} CCD remaining
              today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Spending Limit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Spent This Month</span>
              <span className="font-medium">
                {stats.monthlySpent.toFixed(2)} / {stats.monthlyLimit} CCD
              </span>
            </div>
            <Progress value={monthlyProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {(stats.monthlyLimit - stats.monthlySpent).toFixed(2)} CCD
              remaining this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Eligibility Status */}
      {eligibility && (
        <Card
          className={
            eligibility.eligible
              ? "border-green-200 dark:border-green-800"
              : "border-red-200 dark:border-red-800"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Betting Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Eligible to Place Bets</span>
              <Badge variant={eligibility.eligible ? "default" : "destructive"}>
                {eligibility.eligible ? "✅ Yes" : "❌ No"}
              </Badge>
            </div>
            <div
              className={`p-3 rounded-lg ${
                eligibility.eligible
                  ? "bg-green-50 dark:bg-green-950"
                  : "bg-red-50 dark:bg-red-950"
              }`}
            >
              <p
                className={`text-sm ${
                  eligibility.eligible
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {eligibility.message}
              </p>
              {eligibility.reason && (
                <p
                  className={`text-xs mt-1 ${
                    eligibility.eligible
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  Reason: {eligibility.reason}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Settings,
  Shield,
  Ban,
  Bell,
  Eye,
  Save,
  AlertTriangle,
} from "lucide-react";
import {
  SafeStakeSDKBrowser as SafeStakeSDK,
  AccountAddress as SDKAccountAddress,
  ContractAddress,
} from "@safestake/operator-sdk/browser";
import { AccountTransactionType } from "@concordium/web-sdk";
import {
  CONTRACT_INDEX,
  CONTRACT_SUBINDEX,
  NODE_ADDRESS,
  NODE_PORT,
  VERIFIER_BACKEND_URL,
} from "../config";

interface AccountSettingsProps {
  connection: any;
  account: string;
  sdk: SafeStakeSDK | null;
}

export default function AccountSettings({
  connection,
  account,
  sdk,
}: AccountSettingsProps) {
  const [loading, setLoading] = useState(false);

  // Limit settings
  const [dailyLimit, setDailyLimit] = useState("200");
  const [monthlyLimit, setMonthlyLimit] = useState("1000");

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [limitAlerts, setLimitAlerts] = useState(true);
  const [winLossAlerts, setWinLossAlerts] = useState(false);

  // Privacy settings
  const [showStats, setShowStats] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  const createWalletSigner = () => {
    return async (
      accountAddress: string,
      type: AccountTransactionType,
      payload: any,
      parameters: any
    ) => {
      return await connection.signAndSendTransaction(
        accountAddress,
        type,
        payload,
        parameters
      );
    };
  };

  const handleUpdateLimits = async () => {
    if (!sdk) {
      alert("SDK not initialized");
      return;
    }

    const daily = parseFloat(dailyLimit);
    const monthly = parseFloat(monthlyLimit);

    if (isNaN(daily) || isNaN(monthly) || daily <= 0 || monthly <= 0) {
      alert("Please enter valid limit amounts");
      return;
    }

    if (daily > monthly) {
      alert("Daily limit cannot exceed monthly limit");
      return;
    }

    try {
      setLoading(true);
      const userAccount = SDKAccountAddress.fromBase58(account);
      const walletSigner = createWalletSigner();

      const result = await sdk.setLimitsWithBrowserWallet(
        {
          userAccount,
          dailyLimitCCD: daily,
          monthlyLimitCCD: monthly,
        },
        walletSigner
      );

      if (result.success) {
        alert("✅ Limits updated successfully!");
      } else {
        alert("❌ Failed to update limits: " + result.error);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update limits");
    } finally {
      setLoading(false);
    }
  };

  const handleSelfExclude = async () => {
    if (!sdk) return;

    try {
      setLoading(true);
      const userAccount = SDKAccountAddress.fromBase58(account);
      const walletSigner = createWalletSigner();

      const result = await sdk.selfExcludeWithBrowserWallet(
        { userAccount, durationDays: 30 },
        walletSigner
      );

      if (result.success) {
        alert("✅ Self-excluded for 30 days");
        window.location.reload();
      } else {
        alert("❌ Failed: " + result.error);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Self-exclusion failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Spending Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Spending Limits
          </CardTitle>
          <CardDescription>
            Set daily and monthly limits to control your spending
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              These limits are enforced on-chain and cannot be bypassed. Changes
              take effect immediately.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="daily">Daily Limit (CCD)</Label>
              <Input
                id="daily"
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                disabled={loading}
                min="1"
                step="10"
              />
              <p className="text-xs text-muted-foreground">
                Maximum amount you can wager per day
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly">Monthly Limit (CCD)</Label>
              <Input
                id="monthly"
                type="number"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                disabled={loading}
                min="1"
                step="50"
              />
              <p className="text-xs text-muted-foreground">
                Maximum amount you can wager per month
              </p>
            </div>
          </div>

          <Button
            onClick={handleUpdateLimits}
            disabled={loading || !sdk}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Updating..." : "Update Limits"}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to be notified about your activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive updates about your account via email
              </p>
            </div>
            <Switch
              id="email"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="limits">Limit Alerts</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when approaching spending limits
              </p>
            </div>
            <Switch
              id="limits"
              checked={limitAlerts}
              onCheckedChange={setLimitAlerts}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="winloss">Win/Loss Alerts</Label>
              <p className="text-xs text-muted-foreground">
                Notifications for wins and significant losses
              </p>
            </div>
            <Switch
              id="winloss"
              checked={winLossAlerts}
              onCheckedChange={setWinLossAlerts}
            />
          </div>

          <Button variant="outline" className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Control what information is visible in your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="stats">Show Statistics</Label>
              <p className="text-xs text-muted-foreground">
                Display betting stats and performance metrics
              </p>
            </div>
            <Switch
              id="stats"
              checked={showStats}
              onCheckedChange={setShowStats}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="history">Show Transaction History</Label>
              <p className="text-xs text-muted-foreground">
                Make your betting history visible
              </p>
            </div>
            <Switch
              id="history"
              checked={showHistory}
              onCheckedChange={setShowHistory}
            />
          </div>

          <Button variant="outline" className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Privacy Settings
          </Button>
        </CardContent>
      </Card>

      {/* Self-Exclusion (Danger Zone) */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Ban className="h-5 w-5" />
            Self-Exclusion
          </CardTitle>
          <CardDescription>
            Take a break from gambling for your wellbeing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Self-exclusion will lock your account for 30 days. This action
              cannot be reversed.
            </AlertDescription>
          </Alert>

          <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              When you self-exclude:
            </p>
            <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 ml-4">
              <li>• You cannot place any bets for 30 days</li>
              <li>• You cannot access betting features</li>
              <li>• You cannot cancel or shorten this period</li>
              <li>• Your account will automatically unlock after 30 days</li>
            </ul>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full" size="lg">
                <Ban className="h-4 w-4 mr-2" />
                Activate Self-Exclusion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-red-600">
                  ⚠️ Confirm Self-Exclusion
                </DialogTitle>
                <DialogDescription className="space-y-3 pt-4">
                  <p>
                    This is a serious action to help protect your wellbeing.
                  </p>
                  <p className="font-medium text-foreground">
                    Your account will be locked for 30 days starting
                    immediately.
                  </p>
                  <p>During this time, you will not be able to:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Place any bets</li>
                    <li>Access casino games</li>
                    <li>Use sportsbook features</li>
                    <li>Remove or reduce this restriction</li>
                  </ul>
                  <p className="font-medium text-red-600 pt-2">
                    Are you absolutely sure you want to proceed?
                  </p>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 sm:gap-0">
                <DialogTrigger asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogTrigger>
                <Button
                  onClick={handleSelfExclude}
                  variant="destructive"
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Yes, Self-Exclude Me"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Need immediate help? Visit our{" "}
              <a href="#" className="underline text-blue-600">
                responsible gambling resources
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

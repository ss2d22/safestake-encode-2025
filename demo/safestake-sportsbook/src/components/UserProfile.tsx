import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Settings,
  BarChart3,
  Shield,
  Ban,
  CheckCircle2,
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

interface UserProfileProps {
  connection: any;
  account: string;
  signature: string;
  isRegistered: boolean;
  onRegistrationChange: (registered: boolean) => void;
}

export default function UserProfile({
  connection,
  account,
  signature,
  isRegistered,
  onRegistrationChange,
}: UserProfileProps) {
  const [sdk, setSdk] = useState<SafeStakeSDK | null>(null);
  const [loading, setLoading] = useState(false);

  // Limits
  const [dailyLimit, setDailyLimit] = useState("200");
  const [monthlyLimit, setMonthlyLimit] = useState("1000");

  // Stats
  const [totalBets, setTotalBets] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);

  // Initialize SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        const safeStakeSDK = new SafeStakeSDK({
          platformId: "safestake-sportsbook",
          contractAddress: ContractAddress.create(
            CONTRACT_INDEX,
            CONTRACT_SUBINDEX
          ),
          grpcAddress: NODE_ADDRESS,
          grpcPort: NODE_PORT,
          verifierBackendUrl: VERIFIER_BACKEND_URL,
        });

        await safeStakeSDK.initialize();
        setSdk(safeStakeSDK);
      } catch (err) {
        console.error("SDK init error:", err);
      }
    };

    initSDK();
  }, []);

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

  const handleRegister = async () => {
    if (!sdk) return;

    try {
      setLoading(true);
      const userAccount = SDKAccountAddress.fromBase58(account);
      const walletSigner = createWalletSigner();

      const result = await sdk.registerUserWithBrowserWallet(
        { userAccount, signature },
        walletSigner
      );

      if (result.success) {
        onRegistrationChange(true);
        alert("✅ Registration successful!");
      } else {
        alert("❌ Registration failed: " + result.error);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSetLimits = async () => {
    if (!sdk) return;

    try {
      setLoading(true);
      const userAccount = SDKAccountAddress.fromBase58(account);
      const walletSigner = createWalletSigner();

      const result = await sdk.setLimitsWithBrowserWallet(
        {
          userAccount,
          dailyLimitCCD: parseFloat(dailyLimit),
          monthlyLimitCCD: parseFloat(monthlyLimit),
        },
        walletSigner
      );

      if (result.success) {
        alert("✅ Limits updated!");
      } else {
        alert("❌ Failed: " + result.error);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set limits");
    } finally {
      setLoading(false);
    }
  };

  const handleSelfExclude = async () => {
    if (
      !sdk ||
      !window.confirm("Self-exclude for 30 days? This cannot be undone!")
    )
      return;

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
        onRegistrationChange(false);
      } else {
        alert("❌ Failed: " + result.error);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Self-exclusion failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isRegistered) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Complete Registration
          </CardTitle>
          <CardDescription>
            Register to start placing bets on sports events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              🏆 Join SafeStake Sportsbook
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4">
              <li>• Bet on live and upcoming sports events</li>
              <li>• Create parlay bets with multiple selections</li>
              <li>• Set personal spending limits</li>
              <li>• Self-exclusion options available</li>
            </ul>
          </div>

          <Button
            onClick={handleRegister}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Registering..." : "📝 Register Account"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Account
            </CardTitle>
            <CardDescription>
              Manage settings and view statistics
            </CardDescription>
          </div>
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Registered
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="limits">
              <Shield className="h-4 w-4 mr-2" />
              Limits
            </TabsTrigger>
            <TabsTrigger value="safety">
              <Settings className="h-4 w-4 mr-2" />
              Safety
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Bets Placed
                      </p>
                      <p className="text-3xl font-bold mt-1">{totalBets}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Staked
                      </p>
                      <p className="text-3xl font-bold mt-1">
                        {totalStaked.toFixed(2)} CCD
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground">
                Account:{" "}
                <span className="font-mono">
                  {account.substring(0, 12)}...
                  {account.substring(account.length - 6)}
                </span>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="limits" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="daily">Daily Betting Limit (CCD)</Label>
                <Input
                  id="daily"
                  type="number"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum amount you can bet per day
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthly">Monthly Betting Limit (CCD)</Label>
                <Input
                  id="monthly"
                  type="number"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum amount you can bet per month
                </p>
              </div>

              <Separator />

              <Button
                onClick={handleSetLimits}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Updating..." : "💰 Update Spending Limits"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="safety" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                  ⚠️ Responsible Gambling
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  If you feel you need a break from betting, you can
                  self-exclude your account for 30 days. This action cannot be
                  reversed.
                </p>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full" size="lg">
                    <Ban className="h-4 w-4 mr-2" />
                    Self-Exclude (30 Days)
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-red-600">
                      ⚠️ Self-Exclusion Warning
                    </DialogTitle>
                    <DialogDescription className="space-y-3 pt-4">
                      <p>
                        This will lock your account for 30 days. During this
                        time:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>You cannot place any bets</li>
                        <li>You cannot access betting features</li>
                        <li>This action cannot be reversed or canceled</li>
                      </ul>
                      <p className="font-medium text-foreground pt-2">
                        Are you sure you want to continue?
                      </p>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-2 mt-4">
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </DialogTrigger>
                    <Button
                      onClick={handleSelfExclude}
                      variant="destructive"
                      className="flex-1"
                      disabled={loading}
                    >
                      {loading ? "Processing..." : "Confirm Self-Exclusion"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="text-xs text-center text-muted-foreground">
                <p>Need help? Visit our responsible gambling resources</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

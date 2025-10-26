import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  TrendingUp,
  AlertTriangle,
  Settings,
  Ban,
  Shield,
  DollarSign,
  Activity,
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

interface CasinoGameProps {
  connection: any;
  account: string;
  signature: string;
}

const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

export default function CasinoGame({
  connection,
  account,
  signature,
}: CasinoGameProps) {
  const [sdk, setSdk] = useState<SafeStakeSDK | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Game state
  const [betAmount, setBetAmount] = useState("10");
  const [prediction, setPrediction] = useState<number>(4);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [lastWin, setLastWin] = useState<boolean | null>(null);

  // Limits state
  const [dailyLimit, setDailyLimit] = useState("100");
  const [monthlyLimit, setMonthlyLimit] = useState("500");

  // Stats
  const [eligibility, setEligibility] = useState<any>(null);
  const [totalBets, setTotalBets] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [totalWagered, setTotalWagered] = useState(0);

  // Initialize SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        const safeStakeSDK = new SafeStakeSDK({
          platformId: "safestake-casino",
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

  // Check registration
  useEffect(() => {
    const checkReg = async () => {
      if (!sdk || !account) return;

      try {
        const userAccount = SDKAccountAddress.fromBase58(account);
        const result = await sdk.checkEligibility({
          userAccount,
          proposedAmountCCD: 0.01,
        });

        setIsRegistered(result.reason !== "not_registered");
      } catch (err) {
        console.error("Check reg error:", err);
      }
    };

    checkReg();
  }, [sdk, account]);

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
        setIsRegistered(true);
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

  const PLT_TOKEN_ID = "USDC";

  const handleRollDice = async () => {
    if (!sdk || !isRegistered) return;

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid bet amount");
      return;
    }

    try {
      // Check eligibility first
      const userAccount = SDKAccountAddress.fromBase58(account);
      const eligCheck = await sdk.checkEligibility({
        userAccount,
        proposedAmountCCD: amount,
      });

      setEligibility(eligCheck);

      if (!eligCheck.eligible) {
        alert(`❌ Cannot place bet: ${eligCheck.message}`);
        return;
      }

      setIsRolling(true);
      setLastWin(null);

      // Animate dice roll
      let rolls = 0;
      const rollInterval = setInterval(() => {
        setDiceResult(Math.floor(Math.random() * 6) + 1);
        rolls++;
        if (rolls > 10) {
          clearInterval(rollInterval);
        }
      }, 100);

      setLoading(true);
      const walletSigner = createWalletSigner();

      // 🆕 PLATFORM ACCOUNT
      const PLATFORM_ACCOUNT = SDKAccountAddress.fromBase58(
        "3VMRuYvsXnU3xKEo1WDnRycRjCezuJa3gq5XUNws62CfjnBUNr"
      );

      // 🆕 STEP 1: Transfer REAL PLT tokens to platform
      console.log("💸 Transferring PLT tokens to platform...");
      const pltResult = await sdk.executeRealPLTTransfer(
        {
          userAccount,
          platformAccount: PLATFORM_ACCOUNT,
          amountCCD: amount,
          tokenId: PLT_TOKEN_ID,
          memo: `Dice bet ${Date.now()}`,
        },
        walletSigner
      );

      if (!pltResult.success) {
        clearInterval(rollInterval);
        setIsRolling(false);
        alert("❌ PLT token transfer failed: " + pltResult.error);
        return;
      }

      console.log(
        "✅ PLT tokens transferred! TxHash:",
        pltResult.transactionHash
      );

      // 🆕 STEP 2: Record transaction in registry
      console.log("📝 Recording transaction in SafeStake registry...");
      const recordResult = await sdk.recordTransactionWithBrowserWallet(
        { userAccount, amountCCD: amount },
        walletSigner
      );

      if (recordResult.success) {
        console.log(
          "✅ Transaction recorded! TxHash:",
          recordResult.transactionHash
        );

        // Final dice result
        setTimeout(() => {
          const finalRoll = Math.floor(Math.random() * 6) + 1;
          setDiceResult(finalRoll);
          setIsRolling(false);

          const won = finalRoll >= prediction;
          setLastWin(won);
          setTotalBets((prev) => prev + 1);
          setTotalWagered((prev) => prev + amount);
          if (won) {
            setTotalWins((prev) => prev + 1);

            // Platform would send winnings back via PLT token transfer
            console.log(
              `🎉 Won! Platform would send ${
                amount * multiplier
              } PLT tokens back`
            );
          }
        }, 1200);
      } else {
        clearInterval(rollInterval);
        setIsRolling(false);
        alert(
          "⚠️ PLT tokens transferred but registry update failed: " +
            recordResult.error
        );
      }
    } catch (err) {
      setIsRolling(false);
      alert(err instanceof Error ? err.message : "Bet failed");
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
        setIsRegistered(false);
      } else {
        alert("❌ Failed: " + result.error);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Self-exclusion failed");
    } finally {
      setLoading(false);
    }
  };

  const DiceIcon = diceResult ? diceIcons[diceResult - 1] : Dice3;
  const winRate =
    totalBets > 0 ? ((totalWins / totalBets) * 100).toFixed(1) : "0.0";
  const multiplier = (7 - prediction) * 0.5 + 1;

  if (!isRegistered) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-2">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center text-4xl mb-4">
              🎲
            </div>
            <CardTitle className="text-2xl">
              Welcome to SafeStake Casino
            </CardTitle>
            <CardDescription className="text-base">
              Register your account to start playing dice games
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-3xl mb-2">🎯</div>
                <p className="text-sm font-medium">Fair Odds</p>
                <p className="text-xs text-muted-foreground">
                  Provably fair gaming
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-3xl mb-2">⚡</div>
                <p className="text-sm font-medium">Instant Wins</p>
                <p className="text-xs text-muted-foreground">
                  Real-time results
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-3xl mb-2">🛡️</div>
                <p className="text-sm font-medium">Protected</p>
                <p className="text-xs text-muted-foreground">Spending limits</p>
              </div>
            </div>

            <Separator />

            <Button
              onClick={handleRegister}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Registering..." : "🎲 Register & Start Playing"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Total Bets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBets}</div>
            <p className="text-xs text-muted-foreground mt-1">Games played</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Wins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalWins}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Win rate: {winRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Wagered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWagered.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">USDC total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={eligibility?.eligible ? "default" : "destructive"}
              className="text-xs"
            >
              {eligibility?.eligible ? "✅ Active" : "⚠️ Limited"}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">Account status</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Game Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Game Card - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-xl">🎲 Dice Roll Game</CardTitle>
              <CardDescription>
                Predict the outcome and win up to {multiplier.toFixed(1)}x your
                bet!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dice Display */}
              <div className="relative bg-gradient-to-br from-muted to-muted/50 rounded-2xl p-12">
                <div className="flex justify-center">
                  <div
                    className={`${
                      isRolling ? "animate-bounce" : ""
                    } transition-all duration-300`}
                  >
                    <DiceIcon
                      className={`h-32 w-32 transition-colors duration-300 ${
                        lastWin === true
                          ? "text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                          : lastWin === false
                          ? "text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                          : "text-foreground"
                      }`}
                    />
                  </div>
                </div>

                {lastWin !== null && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={`text-6xl font-bold animate-bounce ${
                        lastWin ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {lastWin ? "🎉" : "💔"}
                    </div>
                  </div>
                )}
              </div>

              {lastWin !== null && (
                <div
                  className={`text-center p-4 rounded-lg ${
                    lastWin
                      ? "bg-green-50 dark:bg-green-950"
                      : "bg-red-50 dark:bg-red-950"
                  }`}
                >
                  <p
                    className={`text-2xl font-bold ${
                      lastWin ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {lastWin
                      ? `🎉 You Won ${(
                          parseFloat(betAmount) * multiplier
                        ).toFixed(2)} USDC!`
                      : `😔 You Lost ${betAmount} USDC`}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      lastWin ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    Rolled: {diceResult} • Predicted: {prediction}+
                  </p>
                </div>
              )}

              <Separator />

              {/* Bet Controls */}
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="bet" className="text-base font-medium">
                      Bet Amount
                    </Label>
                    <div className="relative">
                      <Input
                        id="bet"
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        disabled={isRolling || loading}
                        min="1"
                        step="1"
                        className="text-lg h-12 pr-16"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        USDC
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBetAmount("5")}
                        disabled={isRolling}
                      >
                        5
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBetAmount("10")}
                        disabled={isRolling}
                      >
                        10
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBetAmount("25")}
                        disabled={isRolling}
                      >
                        25
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBetAmount("50")}
                        disabled={isRolling}
                      >
                        50
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="prediction"
                      className="text-base font-medium"
                    >
                      Predict: Roll {prediction} or Higher
                    </Label>
                    <div className="space-y-3">
                      <Input
                        id="prediction"
                        type="range"
                        min="1"
                        max="6"
                        value={prediction}
                        onChange={(e) =>
                          setPrediction(parseInt(e.target.value))
                        }
                        disabled={isRolling || loading}
                        className="cursor-pointer h-12"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Easier
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-base px-3 py-1"
                        >
                          {multiplier.toFixed(1)}x Multiplier
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Harder
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleRollDice}
                  disabled={isRolling || loading || !sdk}
                  className="w-full h-14 text-lg"
                  size="lg"
                >
                  {isRolling ? (
                    <>
                      <span className="animate-spin mr-2">🎲</span>
                      Rolling...
                    </>
                  ) : (
                    <>🎲 Roll Dice • Bet {betAmount} USDC</>
                  )}
                </Button>

                {eligibility && !eligibility.eligible && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Cannot bet:</strong> {eligibility.message}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Settings & Limits */}
        <div className="space-y-6">
          {/* Spending Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Spending Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="daily" className="text-sm">
                  Daily Limit (USDC)
                </Label>
                <Input
                  id="daily"
                  type="number"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  disabled={loading}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthly" className="text-sm">
                  Monthly Limit (USDC)
                </Label>
                <Input
                  id="monthly"
                  type="number"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  disabled={loading}
                  className="h-10"
                />
              </div>

              <Button
                onClick={handleSetLimits}
                disabled={loading}
                className="w-full"
                size="sm"
              >
                {loading ? "Updating..." : "💰 Update Limits"}
              </Button>
            </CardContent>
          </Card>

          {/* Self-Exclusion */}
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-600">
                <Ban className="h-4 w-4" />
                Need a Break?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full" size="sm">
                    🚫 Self-Exclude
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-red-600">
                      ⚠️ Self-Exclusion Warning
                    </DialogTitle>
                    <DialogDescription className="space-y-3 pt-4">
                      <p>This will lock your account for 30 days.</p>
                      <p className="font-medium text-foreground">
                        You will not be able to:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Place any bets</li>
                        <li>Access casino games</li>
                        <li>Remove this restriction early</li>
                      </ul>
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
                      {loading ? "Processing..." : "Confirm"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Lock account for 30 days
              </p>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-sm text-blue-900 dark:text-blue-100">
                💡 Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
              <p>• Higher predictions = Higher multipliers</p>
              <p>• Set limits before you play</p>
              <p>• Take breaks between sessions</p>
              <p>• Gamble responsibly</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

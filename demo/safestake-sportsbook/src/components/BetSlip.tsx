import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, TrendingUp, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import type { Match } from "./MatchDisplay";

interface Bet {
  id: string;
  matchId: string;
  selection: string;
  odds: number;
  match: Match;
}

interface BetSlipProps {
  bets: Bet[];
  onRemoveBet: (betId: string) => void;
  onClearBets: () => void;
  connection: any;
  account: string;
  isRegistered: boolean;
}

export default function BetSlip({
  bets,
  onRemoveBet,
  onClearBets,
  connection,
  account,
  isRegistered,
}: BetSlipProps) {
  const [sdk, setSdk] = useState<SafeStakeSDK | null>(null);
  const [stakeAmount, setStakeAmount] = useState("10");
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<any>(null);
  const [lastBetResult, setLastBetResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

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

  // Calculate total odds for parlay
  const totalOdds = bets.reduce((acc, bet) => acc * bet.odds, 1);
  const stake = parseFloat(stakeAmount) || 0;
  const potentialWin = stake * totalOdds;

  // Check eligibility when stake changes
  useEffect(() => {
    const checkElig = async () => {
      if (!sdk || !account || !isRegistered || stake <= 0) return;

      try {
        const userAccount = SDKAccountAddress.fromBase58(account);
        const result = await sdk.checkEligibility({
          userAccount,
          proposedAmountCCD: stake,
        });
        setEligibility(result);
      } catch (err) {
        console.error("Eligibility check error:", err);
      }
    };

    const debounce = setTimeout(checkElig, 500);
    return () => clearTimeout(debounce);
  }, [sdk, account, stake, isRegistered]);

  const handlePlaceBet = async () => {
    if (!sdk || !isRegistered || bets.length === 0 || stake <= 0) return;

    if (eligibility && !eligibility.eligible) {
      alert(`Cannot place bet: ${eligibility.message}`);
      return;
    }

    try {
      setLoading(true);
      setLastBetResult(null);

      const userAccount = SDKAccountAddress.fromBase58(account);
      const walletSigner = createWalletSigner();

      const result = await sdk.recordTransactionWithBrowserWallet(
        { userAccount, amountCCD: stake },
        walletSigner
      );

      if (result.success) {
        setLastBetResult({
          success: true,
          message: `Bet placed! TX: ${result.transactionHash?.substring(
            0,
            16
          )}...`,
        });

        // Clear bet slip after successful bet
        setTimeout(() => {
          onClearBets();
          setStakeAmount("10");
          setLastBetResult(null);
        }, 3000);
      } else {
        setLastBetResult({
          success: false,
          message: result.error || "Failed to place bet",
        });
      }
    } catch (err) {
      setLastBetResult({
        success: false,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              📋 Bet Slip
              {bets.length > 0 && (
                <Badge variant="secondary">{bets.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {bets.length > 1 ? "Parlay Bet" : "Single Bet"}
            </CardDescription>
          </div>
          {bets.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearBets}>
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {bets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No bets selected</p>
            <p className="text-xs mt-2">Click on odds to add bets</p>
          </div>
        ) : (
          <>
            {/* Bet List */}
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {bets.map((bet) => (
                  <Card key={bet.id} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {bet.match.homeTeam} vs {bet.match.awayTeam}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {bet.match.league}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => onRemoveBet(bet.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{bet.selection}</Badge>
                        <span className="text-sm font-bold">
                          {bet.odds.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            {/* Stake Input */}
            <div className="space-y-2">
              <Label htmlFor="stake">Stake Amount (CCD)</Label>
              <Input
                id="stake"
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                disabled={loading || !isRegistered}
                min="1"
                step="1"
              />
            </div>

            {/* Odds Summary */}
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              {bets.length > 1 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Combined Odds</span>
                  <span className="font-medium">{totalOdds.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stake</span>
                <span className="font-medium">{stake.toFixed(2)} CCD</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Potential Win</span>
                <span className="font-bold text-green-600">
                  {potentialWin.toFixed(2)} CCD
                </span>
              </div>
            </div>

            {/* Eligibility Warning */}
            {eligibility && !eligibility.eligible && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{eligibility.message}</AlertDescription>
              </Alert>
            )}

            {/* Last Bet Result */}
            {lastBetResult && (
              <Alert
                variant={lastBetResult.success ? "default" : "destructive"}
              >
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>{lastBetResult.message}</AlertDescription>
              </Alert>
            )}

            {/* Place Bet Button */}
            <Button
              onClick={handlePlaceBet}
              disabled={
                loading ||
                !isRegistered ||
                !sdk ||
                stake <= 0 ||
                (eligibility && !eligibility.eligible)
              }
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⚙️</span>
                  Placing Bet...
                </>
              ) : (
                `🎯 Place Bet (${stake.toFixed(2)} CCD)`
              )}
            </Button>

            {!isRegistered && (
              <p className="text-xs text-center text-muted-foreground">
                Please register first to place bets
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import {
  type WalletConnectionProps,
  type ConnectorType,
  useConnection,
  useConnect,
} from "@concordium/react-components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import {
  ConcordiumGRPCWebClient,
  getPastDate,
  MIN_DATE,
  BlockHash,
} from "@concordium/web-sdk";
import sha256 from "sha256";
import {
  SafeStakeSDKBrowser as SafeStakeSDK,
  AccountAddress as SDKAccountAddress,
  ContractAddress,
} from "@safestake/operator-sdk/browser";
import {
  NODE_ADDRESS,
  NODE_PORT,
  CONTEXT_STRING,
  VERIFIER_BACKEND_URL,
  CONTRACT_INDEX,
  CONTRACT_SUBINDEX,
} from "./config";
import MatchDisplay, { type Match } from "./components/MatchDisplay";
import BetSlip from "./components/BetSlip";
import UserProfile from "./components/UserProfile";

interface AppProps extends WalletConnectionProps {
  connectorType: ConnectorType;
}

interface Bet {
  id: string;
  matchId: string;
  selection: string;
  odds: number;
  match: Match;
}

function App(props: AppProps) {
  const {
    connectorType,
    setActiveConnectorType,
    activeConnector,
    connectedAccounts,
    genesisHashes,
    network,
  } = props;

  const { connection, setConnection, account } = useConnection(
    connectedAccounts,
    genesisHashes
  );

  const { connect, isConnecting, connectError } = useConnect(
    activeConnector,
    setConnection
  );

  const [isVerified, setIsVerified] = useState(false);
  const [signature, setSignature] = useState<string | undefined>(undefined);
  const [isRegistered, setIsRegistered] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);

  // Age verification state
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeConnector) {
      setActiveConnectorType(connectorType);
    }
  }, [connectorType, setActiveConnectorType, activeConnector]);

  useEffect(() => {
    if (connectError) {
      alert(`Connection error: ${connectError}`);
    }
  }, [connectError]);

  // Check registration status
  useEffect(() => {
    const checkReg = async () => {
      if (!account || !isVerified) return;

      try {
        const sdk = new SafeStakeSDK({
          platformId: "safestake-sportsbook",
          contractAddress: ContractAddress.create(
            CONTRACT_INDEX,
            CONTRACT_SUBINDEX
          ),
          grpcAddress: NODE_ADDRESS,
          grpcPort: NODE_PORT,
          verifierBackendUrl: VERIFIER_BACKEND_URL,
        });

        await sdk.initialize();

        const userAccount = SDKAccountAddress.fromBase58(account);
        const result = await sdk.checkEligibility({
          userAccount,
          proposedAmountCCD: 0.01,
        });

        setIsRegistered(result.reason !== "not_registered");
      } catch (err) {
        console.error("Check registration error:", err);
      }
    };

    checkReg();
  }, [account, isVerified]);

  const handleVerifyAge = async () => {
    if (!connection || !account) {
      setVerifyError("Please connect wallet first");
      return;
    }

    try {
      setVerifying(true);
      setVerifyError(null);

      // Get recent block
      const grpcClient = new ConcordiumGRPCWebClient(NODE_ADDRESS, NODE_PORT);
      const consensusStatus = await grpcClient.getConsensusStatus();
      const recentBlockHash = consensusStatus.lastFinalizedBlock;

      // Create challenge
      const blockHashHex = BlockHash.toHexString(recentBlockHash);
      const encoder = new TextEncoder();
      const contextBytes = encoder.encode(CONTEXT_STRING);
      const contextHex = Array.from(contextBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const combinedHex = blockHashHex + contextHex;
      const challenge = sha256(combinedHex);

      // Define age verification statement
      const eighteenYearsAgo = getPastDate(18, 1);
      const statement = [
        {
          idQualifier: {
            type: "cred" as const,
            issuers: [0, 1, 2, 3, 4, 5, 6, 7],
          },
          statement: [
            {
              type: "AttributeInRange" as const,
              attributeTag: "dob",
              lower: MIN_DATE,
              upper: eighteenYearsAgo,
            },
          ],
        },
      ];

      // Request ZK proof
      const proof = await connection.requestVerifiablePresentation(
        challenge,
        statement
      );

      // Verify with backend
      const response = await fetch(
        `${VERIFIER_BACKEND_URL}/api/verify-and-sign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountAddress: account,
            proof: proof,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Verification failed");
      }

      const { signature: sig } = await response.json();
      setSignature(sig);
      setIsVerified(true);
    } catch (err) {
      console.error("Verification error:", err);
      setVerifyError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setVerifying(false);
    }
  };

  const handleAddToBetSlip = (
    matchId: string,
    selection: string,
    odds: number,
    match: Match
  ) => {
    const betId = `${matchId}-${selection}`;

    // Check if bet already exists
    if (bets.find((b) => b.id === betId)) {
      alert("This selection is already in your bet slip!");
      return;
    }

    const newBet: Bet = { id: betId, matchId, selection, odds, match };
    setBets([...bets, newBet]);
  };

  const handleRemoveBet = (betId: string) => {
    setBets(bets.filter((b) => b.id !== betId));
  };

  const handleClearBets = () => {
    setBets([]);
  };

  const isConnected = !!connection && !!account;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-green-800 bg-green-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-2xl">
                ⚽
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  SafeStake Sportsbook
                </h1>
                <p className="text-sm text-green-200">Live Sports Betting</p>
              </div>
            </div>
            {account && (
              <div className="hidden md:flex items-center gap-3">
                {isVerified && (
                  <Badge
                    variant="secondary"
                    className="bg-green-500 text-white"
                  >
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-800/50 border border-green-700">
                  <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  <span className="text-sm text-green-100 font-mono">
                    {account.substring(0, 8)}...
                    {account.substring(account.length - 6)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Wallet & Profile */}
          <div className="lg:col-span-1 space-y-6">
            {/* Wallet Connection */}
            {!isConnected && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Connect Wallet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Connect your Concordium wallet to start betting
                  </p>
                  <Button
                    onClick={connect}
                    disabled={isConnecting || !activeConnector}
                    className="w-full"
                    size="lg"
                  >
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </Button>
                  {!activeConnector && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        Browser Wallet not detected. Please install it first.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Age Verification */}
            {isConnected && !isVerified && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Age Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Verify you're 18+ using zero-knowledge proofs. Your age
                      remains private.
                    </p>
                  </div>
                  <Button
                    onClick={handleVerifyAge}
                    disabled={verifying}
                    className="w-full"
                    size="lg"
                  >
                    {verifying ? "Verifying..." : "🔐 Verify Age"}
                  </Button>
                  {verifyError && (
                    <p className="text-xs text-red-600">{verifyError}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* User Profile */}
            {isVerified && signature && (
              <UserProfile
                connection={connection}
                account={account!}
                signature={signature}
                isRegistered={isRegistered}
                onRegistrationChange={setIsRegistered}
              />
            )}

            {/* Bet Slip */}
            {isVerified && (
              <BetSlip
                bets={bets}
                onRemoveBet={handleRemoveBet}
                onClearBets={handleClearBets}
                connection={connection}
                account={account!}
                isRegistered={isRegistered}
              />
            )}
          </div>

          {/* Right Column - Matches */}
          <div className="lg:col-span-2">
            {!isVerified ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-6xl mb-4">⚽</div>
                  <h3 className="text-xl font-bold mb-2">
                    Welcome to SafeStake Sportsbook
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Connect your wallet and verify your age to start betting
                  </p>
                  <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                    <span>🔒 Age Verified</span>
                    <span>•</span>
                    <span>⛓️ On-Chain Limits</span>
                    <span>•</span>
                    <span>🛡️ Responsible Gambling</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <MatchDisplay onAddToBetSlip={handleAddToBetSlip} />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-green-800 bg-green-900/50 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-green-200">
              SafeStake Sportsbook - Powered by Concordium Blockchain
            </p>
            <p className="text-xs text-green-300">
              Responsible gambling with zero-knowledge age verification and
              on-chain spending limits
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

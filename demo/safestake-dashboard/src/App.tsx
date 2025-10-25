import { useState, useEffect } from "react";
import {
  type WalletConnectionProps,
  type ConnectorType,
  useConnection,
  useConnect,
} from "@concordium/react-components";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  LayoutDashboard,
  History,
  Settings,
  Wallet,
  ShieldCheck,
  AlertCircle,
  User,
  LogOut,
} from "lucide-react";
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
import DashboardOverview from "./components/DashboardOverview";
import TransactionHistory from "./components/TransactionHistory";
import AccountSettings from "./components/AccountSettings";

interface AppProps extends WalletConnectionProps {
  connectorType: ConnectorType;
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
  const [sdk, setSdk] = useState<SafeStakeSDK | null>(null);
  const [eligibility, setEligibility] = useState<any>(null);

  // Age verification state
  const [verifying, setVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
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

  // Initialize SDK
  useEffect(() => {
    const initSDK = async () => {
      if (!account || !isVerified) return;

      try {
        const safeStakeSDK = new SafeStakeSDK({
          platformId: "safestake-dashboard",
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

        // Check registration
        const userAccount = SDKAccountAddress.fromBase58(account);
        const result = await safeStakeSDK.checkEligibility({
          userAccount,
          proposedAmountCCD: 0.01,
        });

        setIsRegistered(result.reason !== "not_registered");
        setEligibility(result);
      } catch (err) {
        console.error("SDK init error:", err);
      }
    };

    initSDK();
  }, [account, isVerified]);

  const handleVerifyAge = async () => {
    if (!connection || !account) {
      setVerifyError("Please connect wallet first");
      return;
    }

    try {
      setVerifying(true);
      setVerifyError(null);
      setVerifyProgress(10);

      // Get recent block
      const grpcClient = new ConcordiumGRPCWebClient(NODE_ADDRESS, NODE_PORT);
      const consensusStatus = await grpcClient.getConsensusStatus();
      const recentBlockHash = consensusStatus.lastFinalizedBlock;

      setVerifyProgress(30);

      // Create challenge
      const blockHashHex = BlockHash.toHexString(recentBlockHash);
      const encoder = new TextEncoder();
      const contextBytes = encoder.encode(CONTEXT_STRING);
      const contextHex = Array.from(contextBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const combinedHex = blockHashHex + contextHex;
      const challenge = sha256(combinedHex);

      setVerifyProgress(50);

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

      setVerifyProgress(70);

      // Request ZK proof
      const proof = await connection.requestVerifiablePresentation(
        challenge,
        statement
      );

      setVerifyProgress(85);

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
      setVerifyProgress(100);
      setSignature(sig);
      setIsVerified(true);
    } catch (err) {
      console.error("Verification error:", err);
      setVerifyError(err instanceof Error ? err.message : "Unknown error");
      setVerifyProgress(0);
    } finally {
      setTimeout(() => setVerifying(false), 500);
    }
  };

  const handleRegister = async () => {
    if (!sdk || !signature) return;

    try {
      const userAccount = SDKAccountAddress.fromBase58(account!);
      const walletSigner = async (
        accountAddress: string,
        type: any,
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
    }
  };

  const isConnected = !!connection && !!account;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      {/* Top Navigation */}
      <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                S
              </div>
              <div>
                <h1 className="text-xl font-bold">SafeStake Dashboard</h1>
                <p className="text-xs text-muted-foreground">
                  Manage Your Account
                </p>
              </div>
            </div>

            {account && isVerified && (
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="hidden md:flex">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                      {account.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-mono hidden lg:block">
                    {account.substring(0, 8)}...
                    {account.substring(account.length - 6)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 flex-grow">
        {!isConnected ? (
          <div className="max-w-md mx-auto mt-20">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Connect Your Wallet
                </CardTitle>
                <CardDescription>
                  Connect your Concordium wallet to access your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    🔒 Secure access to all your SafeStake gambling accounts and
                    statistics
                  </p>
                </div>
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
          </div>
        ) : !isVerified ? (
          <div className="max-w-md mx-auto mt-20">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Age Verification Required
                </CardTitle>
                <CardDescription>
                  Verify you're 18+ to access your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    🔐 Zero-Knowledge Proof
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    We verify your age without seeing your date of birth or any
                    personal information
                  </p>
                </div>

                {verifying && (
                  <div className="space-y-2">
                    <Progress value={verifyProgress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      Please approve the request in your wallet...
                    </p>
                  </div>
                )}

                {verifyError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {verifyError}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleVerifyAge}
                  disabled={verifying}
                  className="w-full"
                  size="lg"
                >
                  {verifying ? "Verifying..." : "🔐 Verify Age"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : !isRegistered ? (
          <div className="max-w-md mx-auto mt-20">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Complete Registration
                </CardTitle>
                <CardDescription>
                  Register your account to access all features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                      ✓
                    </div>
                    <span>Wallet Connected</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                      ✓
                    </div>
                    <span>Age Verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-5 w-5 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs">
                      3
                    </div>
                    <span>Register On-Chain</span>
                  </div>
                </div>
                <Button
                  onClick={handleRegister}
                  className="w-full"
                  size="lg"
                  disabled={!sdk}
                >
                  📝 Complete Registration
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
              <TabsTrigger value="overview" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <DashboardOverview
                isRegistered={isRegistered}
                eligibility={eligibility}
              />
            </TabsContent>

            <TabsContent value="history">
              <TransactionHistory />
            </TabsContent>

            <TabsContent value="settings">
              <AccountSettings
                connection={connection}
                account={account!}
                sdk={sdk}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              SafeStake Dashboard - Manage your responsible gambling account
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by Concordium Blockchain • Zero-Knowledge Age Verification
              • On-Chain Limits
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

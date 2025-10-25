import { useState, useEffect } from "react";
import {
  type WalletConnectionProps,
  type ConnectorType,
  useConnection,
  useConnect,
} from "@concordium/react-components";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import WalletConnection from "./components/WalletConnection";
import AgeVerification from "./components/AgeVerification";
import CasinoGame from "./components/CasinoGame";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-orange-950 dark:to-red-950 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center shadow-lg">
                <span className="text-2xl">🎲</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  SafeStake Casino
                </h1>
                <p className="text-xs text-muted-foreground">
                  Premium Dice Gaming
                </p>
              </div>
            </div>

            {account && (
              <div className="flex items-center gap-3">
                {isVerified && (
                  <Badge
                    variant="secondary"
                    className="hidden md:flex bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  >
                    ✅ Verified
                  </Badge>
                )}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-gradient-to-br from-red-500 to-orange-500 text-white text-xs">
                      {account.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-mono hidden lg:block">
                    {account.substring(0, 6)}...
                    {account.substring(account.length - 4)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Welcome Banner - Only show when not verified */}
          {!isVerified && (
            <div className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-2xl p-8 text-white shadow-xl">
              <div className="max-w-3xl">
                <h2 className="text-3xl font-bold mb-2">
                  🎲 Welcome to SafeStake Casino
                </h2>
                <p className="text-lg text-white/90 mb-4">
                  Experience premium dice gaming with responsible gambling
                  built-in
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔒</span>
                    <span>Age Verified Gaming</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    <span>Fair Multipliers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    <span>Instant Payouts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🛡️</span>
                    <span>Protected Limits</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Connect Wallet */}
          {!connection && (
            <div className="max-w-2xl mx-auto">
              <WalletConnection
                connection={connection}
                account={account}
                connect={connect}
                isConnecting={isConnecting}
                network={network}
                activeConnector={activeConnector}
              />
            </div>
          )}

          {/* Step 2: Verify Age */}
          {connection && account && !isVerified && (
            <div className="max-w-2xl mx-auto">
              <AgeVerification
                connection={connection}
                account={account}
                onVerified={(sig) => {
                  setSignature(sig);
                  setIsVerified(true);
                }}
              />
            </div>
          )}

          {/* Step 3: Casino Game */}
          {isVerified && signature && connection && account && (
            <CasinoGame
              connection={connection}
              account={account}
              signature={signature}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm font-medium">
                SafeStake Casino - Premium Responsible Gaming
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Powered by Concordium Blockchain • Zero-Knowledge Verification
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="text-base">🔒</span>
                Secure
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="text-base">⚡</span>
                Fast
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="text-base">🛡️</span>
                Protected
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

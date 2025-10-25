import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, CheckCircle2, AlertCircle } from "lucide-react";

interface WalletConnectionProps {
  connection: any;
  account: string | undefined;
  connect: (() => void) | undefined;
  isConnecting: boolean;
  network: any;
  activeConnector: any;
}

export default function WalletConnection({
  connection,
  account,
  connect,
  isConnecting,
  network,
  activeConnector,
}: WalletConnectionProps) {
  const isConnected = !!connection && !!account;

  return (
    <Card className="border-2 shadow-xl">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Wallet className="h-10 w-10 text-white" />
          </div>
        </div>
        <div className="text-center">
          <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
          <CardDescription className="text-base mt-2">
            Connect your Concordium wallet to start playing
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="space-y-6">
            <div className="grid gap-3 text-center">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="text-3xl mb-2">🎮</div>
                <p className="font-medium text-sm">Premium Gaming</p>
                <p className="text-xs text-muted-foreground">
                  Fair odds and instant results
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl border border-green-200 dark:border-green-800">
                <div className="text-3xl mb-2">🛡️</div>
                <p className="font-medium text-sm">Protected Gaming</p>
                <p className="text-xs text-muted-foreground">
                  Spending limits and self-exclusion
                </p>
              </div>
            </div>

            <Button
              onClick={connect}
              disabled={isConnecting || !activeConnector || !connect}
              className="w-full h-12"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <span className="animate-spin mr-2">⚙️</span>
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="h-5 w-5 mr-2" />
                  Connect Concordium Wallet
                </>
              )}
            </Button>

            {!activeConnector && (
              <div className="flex items-start gap-2 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-1">Browser Wallet Required</p>
                  <p className="text-xs">
                    Please install the{" "}
                    <a
                      href="https://chrome.google.com/webstore/detail/concordium-wallet/mnnkpffndmickbiakofclnpoiajlegmg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium hover:text-yellow-900"
                    >
                      Concordium Browser Wallet
                    </a>{" "}
                    to continue
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300 mb-3">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Wallet Connected</span>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Account</span>
                  <span className="font-mono text-xs bg-white dark:bg-gray-900 px-2 py-1 rounded">
                    {account.substring(0, 10)}...
                    {account.substring(account.length - 8)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Network</span>
                  <Badge variant="secondary">
                    {network?.name || "Unknown"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

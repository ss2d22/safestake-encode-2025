import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, Lock, CheckCircle2, XCircle } from "lucide-react";
import {
  ConcordiumGRPCWebClient,
  getPastDate,
  MIN_DATE,
  BlockHash,
} from "@concordium/web-sdk";
import sha256 from "sha256";
import {
  NODE_ADDRESS,
  NODE_PORT,
  CONTEXT_STRING,
  VERIFIER_BACKEND_URL,
} from "../config";

interface AgeVerificationProps {
  connection: any;
  account: string;
  onVerified: (signature: string) => void;
}

export default function AgeVerification({
  connection,
  account,
  onVerified,
}: AgeVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");

  const handleVerifyAge = async () => {
    if (!connection || !account) {
      setError("Please connect wallet first");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setProgress(10);
      setStep("Connecting to blockchain...");

      // 1. Get recent block for challenge
      const grpcClient = new ConcordiumGRPCWebClient(NODE_ADDRESS, NODE_PORT);
      const consensusStatus = await grpcClient.getConsensusStatus();
      const recentBlockHash = consensusStatus.lastFinalizedBlock;

      setProgress(25);
      setStep("Generating challenge...");

      // 2. Create challenge
      const blockHashHex = BlockHash.toHexString(recentBlockHash);
      const encoder = new TextEncoder();
      const contextBytes = encoder.encode(CONTEXT_STRING);
      const contextHex = Array.from(contextBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const combinedHex = blockHashHex + contextHex;
      const challenge = sha256(combinedHex);

      setProgress(40);
      setStep("Preparing zero-knowledge proof...");

      // 3. Define age verification statement (must be 18+)
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

      setProgress(55);
      setStep("Requesting proof from wallet...");

      // 4. Request ZK proof from wallet
      const proof = await connection.requestVerifiablePresentation(
        challenge,
        statement
      );

      setProgress(75);
      setStep("Verifying proof...");

      // 5. Send proof to backend for verification
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

      const { signature } = await response.json();

      setProgress(100);
      setStep("Verification complete!");

      // 6. Call parent component with signature
      setTimeout(() => onVerified(signature), 500);
    } catch (err) {
      console.error("Verification error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setProgress(0);
      setStep("");
    } finally {
      if (!error) {
        setTimeout(() => setLoading(false), 1000);
      } else {
        setLoading(false);
      }
    }
  };

  return (
    <Card className="border-2 shadow-xl">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>
        </div>
        <div className="text-center">
          <CardTitle className="text-2xl">Age Verification</CardTitle>
          <CardDescription className="text-base mt-2">
            Verify you're 18+ using zero-knowledge proofs
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  🔐 Privacy-Preserving Verification
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  We verify you're 18+ without seeing your date of birth or any
                  personal information
                </p>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-blue-800 dark:text-blue-200 ml-13">
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span>No personal data shared</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span>Cryptographic proof only</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span>Your age remains private</span>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            <Progress value={progress} className="h-3" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">{step}</p>
              <p className="text-xs text-muted-foreground">
                Please approve the proof request in your wallet
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-800 rounded-xl">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-100 mb-1">
                Verification Failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        <Button
          onClick={handleVerifyAge}
          disabled={loading}
          className="w-full h-12"
          size="lg"
        >
          {loading ? (
            <>
              <span className="animate-spin mr-2">⚙️</span>
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5 mr-2" />
              Verify Age with Zero-Knowledge Proof
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

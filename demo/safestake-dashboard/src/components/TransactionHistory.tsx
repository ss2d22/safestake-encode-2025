import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";

interface Transaction {
  id: string;
  date: string;
  platform: string;
  type: string;
  amount: number;
  result?: "won" | "lost" | "pending";
  payout?: number;
  description: string;
}

// Mock transaction data
const mockTransactions: Transaction[] = [
  {
    id: "tx1",
    date: "2025-10-25 14:30",
    platform: "Casino",
    type: "Dice Roll",
    amount: 10,
    result: "won",
    payout: 15,
    description: "Predicted 4+ and rolled 5",
  },
  {
    id: "tx2",
    date: "2025-10-25 13:15",
    platform: "Sportsbook",
    type: "Single Bet",
    amount: 25,
    result: "lost",
    description: "Man Utd vs Liverpool",
  },
  {
    id: "tx3",
    date: "2025-10-25 11:45",
    platform: "Casino",
    type: "Dice Roll",
    amount: 15,
    result: "lost",
    description: "Predicted 5+ and rolled 3",
  },
  {
    id: "tx4",
    date: "2025-10-24 19:20",
    platform: "Sportsbook",
    type: "Parlay Bet",
    amount: 20,
    result: "won",
    payout: 65,
    description: "3-leg parlay (Arsenal, Lakers, Djokovic)",
  },
  {
    id: "tx5",
    date: "2025-10-24 16:00",
    platform: "Casino",
    type: "Dice Roll",
    amount: 12,
    result: "won",
    payout: 18,
    description: "Predicted 3+ and rolled 6",
  },
  {
    id: "tx6",
    date: "2025-10-24 14:30",
    platform: "Sportsbook",
    type: "Single Bet",
    amount: 30,
    result: "pending",
    description: "Real Madrid vs Barcelona",
  },
  {
    id: "tx7",
    date: "2025-10-23 20:15",
    platform: "Casino",
    type: "Dice Roll",
    amount: 8,
    result: "lost",
    description: "Predicted 6 and rolled 2",
  },
  {
    id: "tx8",
    date: "2025-10-23 18:45",
    platform: "Sportsbook",
    type: "Single Bet",
    amount: 15,
    result: "won",
    payout: 28.5,
    description: "Bayern Munich vs PSG",
  },
];

export default function TransactionHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterResult, setFilterResult] = useState("all");

  // Filter transactions
  const filteredTransactions = mockTransactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform =
      filterPlatform === "all" || tx.platform === filterPlatform;
    const matchesResult = filterResult === "all" || tx.result === filterResult;

    return matchesSearch && matchesPlatform && matchesResult;
  });

  const totalWagered = filteredTransactions.reduce(
    (sum, tx) => sum + tx.amount,
    0
  );
  const totalWon = filteredTransactions
    .filter((tx) => tx.result === "won")
    .reduce((sum, tx) => sum + (tx.payout || 0), 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>
              View and filter your betting history
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {filteredTransactions.length} transactions
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger>
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="Casino">🎲 Casino</SelectItem>
              <SelectItem value="Sportsbook">⚽ Sportsbook</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterResult} onValueChange={setFilterResult}>
            <SelectTrigger>
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="won">✅ Won</SelectItem>
              <SelectItem value="lost">❌ Lost</SelectItem>
              <SelectItem value="pending">⏳ Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Wagered</p>
            <p className="text-lg font-bold">{totalWagered.toFixed(2)} CCD</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Total Won</p>
            <p className="text-lg font-bold text-green-600">
              {totalWon.toFixed(2)} CCD
            </p>
          </div>
        </div>

        <Separator />

        {/* Transaction List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No transactions found</p>
                <p className="text-xs mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <Card key={tx.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {tx.platform === "Casino" ? "🎲" : "⚽"}{" "}
                            {tx.platform}
                          </Badge>
                          {tx.result === "won" && (
                            <Badge
                              variant="default"
                              className="bg-green-500 text-xs"
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Won
                            </Badge>
                          )}
                          {tx.result === "lost" && (
                            <Badge variant="destructive" className="text-xs">
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Lost
                            </Badge>
                          )}
                          {tx.result === "pending" && (
                            <Badge variant="secondary" className="text-xs">
                              ⏳ Pending
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium">{tx.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {tx.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tx.date}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-red-600">
                          -{tx.amount} CCD
                        </p>
                        {tx.payout && (
                          <p className="text-sm font-medium text-green-600">
                            +{tx.payout} CCD
                          </p>
                        )}
                        {tx.result === "won" && tx.payout && (
                          <p className="text-xs text-green-600">
                            +{(tx.payout - tx.amount).toFixed(2)} profit
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

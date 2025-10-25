import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Trophy, Clock, TrendingUp } from "lucide-react";

export interface Match {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  drawOdds: number | null;
  awayOdds: number;
  startTime: string;
  status: "live" | "upcoming";
}

interface MatchDisplayProps {
  onAddToBetSlip: (
    matchId: string,
    selection: string,
    odds: number,
    match: Match
  ) => void;
}

// Mock match data
const mockMatches: Match[] = [
  {
    id: "1",
    sport: "Football",
    league: "Premier League",
    homeTeam: "Manchester United",
    awayTeam: "Liverpool",
    homeOdds: 2.45,
    drawOdds: 3.2,
    awayOdds: 2.85,
    startTime: "Today 15:00",
    status: "live",
  },
  {
    id: "2",
    sport: "Football",
    league: "Premier League",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    homeOdds: 1.95,
    drawOdds: 3.4,
    awayOdds: 3.8,
    startTime: "Today 17:30",
    status: "upcoming",
  },
  {
    id: "3",
    sport: "Basketball",
    league: "NBA",
    homeTeam: "Lakers",
    awayTeam: "Warriors",
    homeOdds: 1.85,
    drawOdds: null,
    awayOdds: 2.0,
    startTime: "Tomorrow 02:00",
    status: "upcoming",
  },
  {
    id: "4",
    sport: "Football",
    league: "La Liga",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    homeOdds: 2.1,
    drawOdds: 3.3,
    awayOdds: 3.4,
    startTime: "Tomorrow 20:00",
    status: "upcoming",
  },
  {
    id: "5",
    sport: "Tennis",
    league: "ATP Tour",
    homeTeam: "Djokovic",
    awayTeam: "Alcaraz",
    homeOdds: 1.75,
    drawOdds: null,
    awayOdds: 2.15,
    startTime: "Tomorrow 14:00",
    status: "upcoming",
  },
  {
    id: "6",
    sport: "Football",
    league: "Champions League",
    homeTeam: "Bayern Munich",
    awayTeam: "PSG",
    homeOdds: 2.2,
    drawOdds: 3.1,
    awayOdds: 3.2,
    startTime: "Wed 21:00",
    status: "upcoming",
  },
];

export default function MatchDisplay({ onAddToBetSlip }: MatchDisplayProps) {
  const [selectedSport, setSelectedSport] = useState("all");

  const sports = ["all", ...new Set(mockMatches.map((m) => m.sport))];

  const filteredMatches =
    selectedSport === "all"
      ? mockMatches
      : mockMatches.filter((m) => m.sport === selectedSport);

  const getSportEmoji = (sport: string) => {
    const emojis: { [key: string]: string } = {
      Football: "⚽",
      Basketball: "🏀",
      Tennis: "🎾",
    };
    return emojis[sport] || "🏆";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Live & Upcoming Matches
            </CardTitle>
            <Badge
              variant="outline"
              className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
            >
              <span className="animate-pulse mr-1">●</span>
              {mockMatches.filter((m) => m.status === "live").length} Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Sport Filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {sports.map((sport) => (
              <Button
                key={sport}
                variant={selectedSport === sport ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSport(sport)}
                className="whitespace-nowrap"
              >
                {sport === "all"
                  ? "All Sports"
                  : `${getSportEmoji(sport)} ${sport}`}
              </Button>
            ))}
          </div>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {filteredMatches.map((match) => (
                <Card key={match.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Match Header */}
                    <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getSportEmoji(match.sport)}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{match.league}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {match.startTime}
                          </div>
                        </div>
                      </div>
                      {match.status === "live" && (
                        <Badge variant="destructive" className="animate-pulse">
                          ● LIVE
                        </Badge>
                      )}
                    </div>

                    {/* Teams and Odds */}
                    <div className="p-4 space-y-2">
                      {/* Home Team */}
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{match.homeTeam}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-w-[60px] hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950 dark:hover:text-green-300"
                          onClick={() =>
                            onAddToBetSlip(
                              match.id,
                              match.homeTeam,
                              match.homeOdds,
                              match
                            )
                          }
                        >
                          {match.homeOdds.toFixed(2)}
                        </Button>
                      </div>

                      {/* Draw (if applicable) */}
                      {match.drawOdds && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-muted-foreground">
                            Draw
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-w-[60px] hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950 dark:hover:text-green-300"
                            onClick={() =>
                              onAddToBetSlip(
                                match.id,
                                "Draw",
                                match.drawOdds!,
                                match
                              )
                            }
                          >
                            {match.drawOdds.toFixed(2)}
                          </Button>
                        </div>
                      )}

                      {/* Away Team */}
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{match.awayTeam}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-w-[60px] hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950 dark:hover:text-green-300"
                          onClick={() =>
                            onAddToBetSlip(
                              match.id,
                              match.awayTeam,
                              match.awayOdds,
                              match
                            )
                          }
                        >
                          {match.awayOdds.toFixed(2)}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

package com.cricai.backend.dto;

import com.cricai.backend.entity.Match;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchSummaryDto {
    private String matchId;
    private String matchType;
    private String eventName;
    private LocalDate matchDate;
    private String venue;
    private String team1;
    private String team2;
    private String winner;
    private Integer marginRuns;
    private Integer marginWickets;
    private String playerOfMatch;

    public static MatchSummaryDto fromEntity(Match match) {
        return MatchSummaryDto.builder()
                .matchId(match.getMatchId())
                .matchType(match.getMatchType())
                .eventName(match.getEventName())
                .matchDate(match.getMatchDate())
                .venue(match.getVenue())
                .team1(match.getTeam1())
                .team2(match.getTeam2())
                .winner(match.getWinner())
                .marginRuns(match.getMarginRuns())
                .marginWickets(match.getMarginWickets())
                .playerOfMatch(match.getPlayerOfMatch())
                .build();
    }
}
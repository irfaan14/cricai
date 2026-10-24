package com.cricai.backend.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Match {

    @Id
    @Column(name = "match_id", length = 32, nullable = false)
    private String matchId;

    @Column(name = "match_type", length = 20, nullable = false)
    private String matchType;

    @Column(name = "event_name", length = 150)
    private String eventName;

    @Column(name = "match_date")
    private LocalDate matchDate;

    @Column(name = "season", length = 20)
    private String season;

    @Column(name = "venue", length = 200)
    private String venue;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "team1", length = 100, nullable = false)
    private String team1;

    @Column(name = "team2", length = 100, nullable = false)
    private String team2;

    @Column(name = "toss_winner", length = 100)
    private String tossWinner;

    @Column(name = "toss_decision", length = 16)
    private String tossDecision;

    @Column(name = "winner", length = 100)
    private String winner;

    @Column(name = "margin_runs")
    private Integer marginRuns;

    @Column(name = "margin_wickets")
    private Integer marginWickets;

    @Column(name = "result_type", length = 32)
    private String resultType;

    @Column(name = "player_of_match", length = 100)
    private String playerOfMatch;

    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    @JsonManagedReference
    private List<Delivery> deliveries = new ArrayList<>();
}
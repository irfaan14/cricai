package com.cricai.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "deliveries", indexes = {
        @Index(name = "idx_deliv_match_innings", columnList = "match_id, innings_number"),
        @Index(name = "idx_deliv_batter", columnList = "batter"),
        @Index(name = "idx_deliv_bowler", columnList = "bowler")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    @JsonBackReference
    private Match match;

    @Column(name = "innings_number", nullable = false)
    private Integer inningsNumber;

    @Column(name = "batting_team", length = 100, nullable = false)
    private String battingTeam;

    @Column(name = "bowling_team", length = 100, nullable = false)
    private String bowlingTeam;

    @Column(name = "over_number", nullable = false)
    private Integer overNumber;

    @Column(name = "ball_number", nullable = false)
    private Integer ballNumber;

    @Column(name = "batter", length = 100, nullable = false)
    private String batter;

    @Column(name = "non_striker", length = 100, nullable = false)
    private String nonStriker;

    @Column(name = "bowler", length = 100, nullable = false)
    private String bowler;

    @Column(name = "runs_batter", nullable = false)
    private Integer runsBatter;

    @Column(name = "runs_extras", nullable = false)
    private Integer runsExtras;

    @Column(name = "runs_total", nullable = false)
    private Integer runsTotal;

    @Column(name = "is_wicket", nullable = false)
    private Boolean isWicket;

    @Column(name = "dismissal_kind", length = 50)
    private String dismissalKind;

    @Column(name = "player_dismissed", length = 100)
    private String playerDismissed;

    @Column(name = "fielder", length = 100)
    private String fielder;
}
package com.cricai.backend.controller;

import com.cricai.backend.dto.MatchSummaryDto;
import com.cricai.backend.entity.Match;
import com.cricai.backend.service.MatchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
@CrossOrigin(origins = "*")
public class MatchController {

    private final MatchService matchService;

    public MatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    // Fast list endpoint: returns match cards without deliveries
    @GetMapping
    public List<MatchSummaryDto> getAllMatches() {
        return matchService.getAllMatchSummaries();
    }

    // Detail endpoint: returns full match with all ball-by-ball deliveries
    @GetMapping("/{id}")
    public ResponseEntity<Match> getMatchById(@PathVariable String id) {
        return matchService.getMatchById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
package com.cricai.backend.service;

import com.cricai.backend.dto.MatchSummaryDto;
import com.cricai.backend.entity.Match;
import com.cricai.backend.repository.MatchRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MatchService {

    private final MatchRepository matchRepository;

    public MatchService(MatchRepository matchRepository) {
        this.matchRepository = matchRepository;
    }

    // Fetches top 50 matches for fast list views
    public List<MatchSummaryDto> getTop50MatchSummaries() {
        return matchRepository.findTop50ByOrderByMatchDateDesc()
                .stream()
                .map(MatchSummaryDto::fromEntity)
                .toList();
    }

    // Retained for backwards compatibility or full exports if needed
    public List<MatchSummaryDto> getAllMatchSummaries() {
        return matchRepository.findAll()
                .stream()
                .map(MatchSummaryDto::fromEntity)
                .toList();
    }

    // Detail endpoint: returns full match with all ball-by-ball deliveries
    public Optional<Match> getMatchById(String matchId) {
        return matchRepository.findById(matchId);
    }
}
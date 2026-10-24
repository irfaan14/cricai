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

    public List<MatchSummaryDto> getAllMatchSummaries() {
        return matchRepository.findAll()
                .stream()
                .map(MatchSummaryDto::fromEntity)
                .toList();
    }

    public Optional<Match> getMatchById(String matchId) {
        return matchRepository.findById(matchId);
    }
}
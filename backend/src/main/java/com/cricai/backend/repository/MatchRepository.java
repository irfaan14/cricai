package com.cricai.backend.repository;

import com.cricai.backend.entity.Match;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MatchRepository extends JpaRepository<Match, String> {
    // Fetches the latest 50 matches ordered by date
    List<Match> findTop50ByOrderByMatchDateDesc();
}
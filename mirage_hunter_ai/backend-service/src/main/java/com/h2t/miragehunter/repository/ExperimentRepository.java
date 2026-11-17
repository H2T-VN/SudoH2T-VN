package com.h2t.miragehunter.repository;

import com.h2t.miragehunter.entity.Experiment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExperimentRepository extends JpaRepository<Experiment, Long> {
}

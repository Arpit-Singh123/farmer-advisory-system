package com.example.farmeradvisory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FarmerQueryRepository extends JpaRepository<FarmerQuery, Long> {
    List<FarmerQuery> findAllByOrderByCreatedAtDesc();
}
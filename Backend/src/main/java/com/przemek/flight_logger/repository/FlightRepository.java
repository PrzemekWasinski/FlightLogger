package com.przemek.flight_logger.repository;

import com.przemek.flight_logger.model.Flight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface FlightRepository extends JpaRepository<Flight, Long> {
}

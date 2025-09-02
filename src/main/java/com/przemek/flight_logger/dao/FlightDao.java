package com.przemek.flight_logger.dao;

import com.przemek.flight_logger.model.Flight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FlightDao extends JpaRepository<Flight, Integer> {

}

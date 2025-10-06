package com.przemek.flight_logger.repository;

import com.przemek.flight_logger.model.Flight;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class FlightRepositoryTest {

    @Autowired
    private FlightRepository flightRepository;

    @Test
    void testSaveAndFindFlight() {
        Flight flight = new Flight();
        flight.setAirline("LOT");
        flight.setFlightNumber("LO123");
        flight.setDepAirport("WAW");
        flight.setArrAirport("LHR");

        // Save flight to repository
        flightRepository.save(flight);

        // Find all flights
        List<Flight> flights = flightRepository.findAll();
        assertEquals(1, flights.size());

        // Find by ID
        Optional<Flight> found = flightRepository.findById(flights.get(0).getId());
        assertTrue(found.isPresent());
        assertEquals("LOT", found.get().getAirline());
    }

    @Test
    void testDeleteFlight() {
        Flight flight = new Flight();
        flight.setAirline("Ryanair");
        flightRepository.save(flight);

        // Delete flight
        flightRepository.delete(flight);
        assertTrue(flightRepository.findAll().isEmpty());
    }
}

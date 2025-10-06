package com.przemek.flight_logger.service;

import com.przemek.flight_logger.model.Flight;
import com.przemek.flight_logger.repository.FlightRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

// Unit tests for the FlightService class
class FlightServiceTest {

    // Mock repository to simulate database operations
    @Mock
    private FlightRepository flightRepository;

    // Service under test with mocked dependencies injected
    @InjectMocks
    private FlightService flightService;

    // Reusable test object
    private Flight flight;

    // Runs before every test case
    @BeforeEach
    void setUp() {
        // Initialize mock annotations
        MockitoAnnotations.openMocks(this);

        // Create a mock Flight object with sample data
        flight = new Flight();
        flight.setId(1L);
        flight.setAirline("LOT Polish Airlines");
        flight.setFlightNumber("LO123");
        flight.setDepAirport("WAW");
        flight.setArrAirport("LHR");
    }

    // Test retrieving all flights from the repository
    @Test
    void testGetAllFlights() {
        // Mock repository response
        when(flightRepository.findAll()).thenReturn(Arrays.asList(flight));

        // Call the method under test
        List<Flight> flights = flightService.getAllFlights();

        // Verify results
        assertNotNull(flights);
        assertEquals(1, flights.size());
        assertEquals("LOT Polish Airlines", flights.get(0).getAirline());

        // Ensure repository was called exactly once
        verify(flightRepository, times(1)).findAll();
    }

    // Test finding a flight by ID when it exists
    @Test
    void testGetFlightById_Found() {
        // Mock repository behavior
        when(flightRepository.findById(1L)).thenReturn(Optional.of(flight));

        // Call service
        Optional<Flight> result = flightService.getFlightById(1L);

        // Verify expected outcome
        assertTrue(result.isPresent());
        assertEquals("LO123", result.get().getFlightNumber());
    }

    // Test finding a flight by ID when it does not exist
    @Test
    void testGetFlightById_NotFound() {
        // Mock empty result
        when(flightRepository.findById(1L)).thenReturn(Optional.empty());

        // Call service
        Optional<Flight> result = flightService.getFlightById(1L);

        // Assert flight not found
        assertFalse(result.isPresent());
    }

    // Test adding a new flight
    @Test
    void testAddFlight() {
        // Simulate successful save
        when(flightRepository.save(flight)).thenReturn(flight);

        // Call service
        boolean result = flightService.addFlight(flight);

        // Verify operation success
        assertTrue(result);
        verify(flightRepository, times(1)).save(flight);
    }

    // Test deleting an existing flight
    @Test
    void testDeleteFlight() {
        // Simulate delete operation
        doNothing().when(flightRepository).delete(flight);

        // Call service
        boolean result = flightService.deleteFlight(flight);

        // Assert success
        assertTrue(result);
        verify(flightRepository, times(1)).delete(flight);
    }

    // Test updating a flight when it exists
    @Test
    void testUpdateFlight_Found() {
        // Mock repository behavior
        when(flightRepository.findById(1L)).thenReturn(Optional.of(flight));
        when(flightRepository.save(any(Flight.class))).thenReturn(flight);

        // Create updated flight data
        Flight updated = new Flight();
        updated.setDate("2025-10-06");
        updated.setAirline("Ryanair");
        updated.setFlightNumber("FR123");

        // Call service
        boolean result = flightService.updateFlight(1L, updated);

        // Assert successful update
        assertTrue(result);
        verify(flightRepository, times(1)).save(any(Flight.class));
    }

    // Test updating a flight when not found
    @Test
    void testUpdateFlight_NotFound() {
        // Mock no result found
        when(flightRepository.findById(2L)).thenReturn(Optional.empty());

        // Call update
        boolean result = flightService.updateFlight(2L, new Flight());

        // Assert failure
        assertFalse(result);
        verify(flightRepository, never()).save(any());
    }
}

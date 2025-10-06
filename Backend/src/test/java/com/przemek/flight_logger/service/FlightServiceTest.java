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

class FlightServiceTest {

    @Mock
    private FlightRepository flightRepository;

    @InjectMocks
    private FlightService flightService;

    private Flight flight;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        flight = new Flight();
        flight.setId(1L);
        flight.setAirline("LOT Polish Airlines");
        flight.setFlightNumber("LO123");
        flight.setDepAirport("WAW");
        flight.setArrAirport("LHR");
    }

    @Test
    void testGetAllFlights() {
        when(flightRepository.findAll()).thenReturn(Arrays.asList(flight));

        List<Flight> flights = flightService.getAllFlights();

        assertNotNull(flights);
        assertEquals(1, flights.size());
        assertEquals("LOT Polish Airlines", flights.get(0).getAirline());
        verify(flightRepository, times(1)).findAll();
    }

    @Test
    void testGetFlightById_Found() {
        when(flightRepository.findById(1L)).thenReturn(Optional.of(flight));

        Optional<Flight> result = flightService.getFlightById(1L);

        assertTrue(result.isPresent());
        assertEquals("LO123", result.get().getFlightNumber());
    }

    @Test
    void testGetFlightById_NotFound() {
        when(flightRepository.findById(1L)).thenReturn(Optional.empty());

        Optional<Flight> result = flightService.getFlightById(1L);

        assertFalse(result.isPresent());
    }

    @Test
    void testAddFlight() {
        when(flightRepository.save(flight)).thenReturn(flight);

        boolean result = flightService.addFlight(flight);

        assertTrue(result);
        verify(flightRepository, times(1)).save(flight);
    }

    @Test
    void testDeleteFlight() {
        doNothing().when(flightRepository).delete(flight);

        boolean result = flightService.deleteFlight(flight);

        assertTrue(result);
        verify(flightRepository, times(1)).delete(flight);
    }

    @Test
    void testUpdateFlight_Found() {
        when(flightRepository.findById(1L)).thenReturn(Optional.of(flight));
        when(flightRepository.save(any(Flight.class))).thenReturn(flight);

        Flight updated = new Flight();
        updated.setDate("2025-10-06");
        updated.setAirline("Ryanair");
        updated.setFlightNumber("FR123");

        boolean result = flightService.updateFlight(1L, updated);

        assertTrue(result);
        verify(flightRepository, times(1)).save(any(Flight.class));
    }

    @Test
    void testUpdateFlight_NotFound() {
        when(flightRepository.findById(2L)).thenReturn(Optional.empty());

        boolean result = flightService.updateFlight(2L, new Flight());

        assertFalse(result);
        verify(flightRepository, never()).save(any());
    }
}

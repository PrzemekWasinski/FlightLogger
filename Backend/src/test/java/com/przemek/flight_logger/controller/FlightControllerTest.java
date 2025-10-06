package com.przemek.flight_logger.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.przemek.flight_logger.model.Flight;
import com.przemek.flight_logger.service.FlightService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Web layer test for FlightController
@WebMvcTest(FlightController.class)
class FlightControllerTest {

    // MockMvc simulates HTTP requests to controller endpoints
    @Autowired
    private MockMvc mockMvc;

    // Mock service to isolate controller behavior
    @MockBean
    private FlightService flightService;

    // Used to convert Java objects to JSON strings
    @Autowired
    private ObjectMapper objectMapper;

    // Test retrieving all flights
    @Test
    void testGetAllFlights() throws Exception {
        // Setup mock response
        Flight flight = new Flight();
        flight.setAirline("LOT");
        Mockito.when(flightService.getAllFlights()).thenReturn(Collections.singletonList(flight));

        // Perform GET request
        mockMvc.perform(get("/flights/all"))
                // Check response status
                .andExpect(status().isOk())
                // Check response body
                .andExpect(jsonPath("$[0].airline").value("LOT"));
    }

    // Test fetching a flight by ID when found
    @Test
    void testGetFlightById_Found() throws Exception {
        // Mock flight data
        Flight flight = new Flight();
        flight.setId(1L);
        flight.setAirline("Ryanair");

        // Simulate successful lookup
        Mockito.when(flightService.getFlightById(1L)).thenReturn(Optional.of(flight));

        // Perform GET request
        mockMvc.perform(get("/flights/flight/1"))
                // Assert OK status
                .andExpect(status().isOk())
                // Verify airline name
                .andExpect(jsonPath("$.airline").value("Ryanair"));
    }

    // Test fetching a flight by ID when not found
    @Test
    void testGetFlightById_NotFound() throws Exception {
        // Simulate not found response
        Mockito.when(flightService.getFlightById(999L)).thenReturn(Optional.empty());

        // Perform request and expect 404
        mockMvc.perform(get("/flights/flight/999"))
                .andExpect(status().isNotFound());
    }

    // Test adding a new flight
    @Test
    void testAddFlight() throws Exception {
        // Create test flight object
        Flight flight = new Flight();
        flight.setAirline("WizzAir");

        // Mock service success
        Mockito.when(flightService.addFlight(any(Flight.class))).thenReturn(true);

        // Send POST request
        mockMvc.perform(post("/flights/add")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(flight)))
                // Expect success
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    // Test updating an existing flight
    @Test
    void testUpdateFlight() throws Exception {
        // Prepare updated flight data
        Flight updated = new Flight();
        updated.setAirline("Lufthansa");

        // Mock successful update
        Mockito.when(flightService.updateFlight(Mockito.eq(1L), any(Flight.class))).thenReturn(true);

        // Perform PUT request
        mockMvc.perform(put("/flights/update/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                // Expect OK and true result
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    // Test deleting a flight
    @Test
    void testDeleteFlight() throws Exception {
        // Create a sample flight
        Flight flight = new Flight();
        flight.setId(1L);

        // Mock successful deletion
        Mockito.when(flightService.deleteFlight(any(Flight.class))).thenReturn(true);

        // Perform DELETE request
        mockMvc.perform(delete("/flights/delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(flight)))
                // Expect OK and true
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }
}

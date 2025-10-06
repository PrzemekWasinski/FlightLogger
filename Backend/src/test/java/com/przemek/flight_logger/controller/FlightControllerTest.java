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

@WebMvcTest(FlightController.class)
class FlightControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FlightService flightService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testGetAllFlights() throws Exception {
        Flight flight = new Flight();
        flight.setAirline("LOT");
        Mockito.when(flightService.getAllFlights()).thenReturn(Collections.singletonList(flight));

        mockMvc.perform(get("/flights/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].airline").value("LOT"));
    }

    @Test
    void testGetFlightById_Found() throws Exception {
        Flight flight = new Flight();
        flight.setId(1L);
        flight.setAirline("Ryanair");

        Mockito.when(flightService.getFlightById(1L)).thenReturn(Optional.of(flight));

        mockMvc.perform(get("/flights/flight/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.airline").value("Ryanair"));
    }

    @Test
    void testGetFlightById_NotFound() throws Exception {
        Mockito.when(flightService.getFlightById(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/flights/flight/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void testAddFlight() throws Exception {
        Flight flight = new Flight();
        flight.setAirline("WizzAir");

        Mockito.when(flightService.addFlight(any(Flight.class))).thenReturn(true);

        mockMvc.perform(post("/flights/add")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(flight)))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    void testUpdateFlight() throws Exception {
        Flight updated = new Flight();
        updated.setAirline("Lufthansa");

        Mockito.when(flightService.updateFlight(Mockito.eq(1L), any(Flight.class))).thenReturn(true);

        mockMvc.perform(put("/flights/update/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    void testDeleteFlight() throws Exception {
        Flight flight = new Flight();
        flight.setId(1L);

        Mockito.when(flightService.deleteFlight(any(Flight.class))).thenReturn(true);

        mockMvc.perform(delete("/flights/delete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(flight)))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }
}

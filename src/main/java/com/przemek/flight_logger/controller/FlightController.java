package com.przemek.flight_logger.controller;

import com.przemek.flight_logger.model.Flight;
import com.przemek.flight_logger.service.FlightService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("planes")
public class FlightController {

    @Autowired
    FlightService flightService;

    @GetMapping("all")
    public ResponseEntity<List<Flight>> getAllFlights() {
        return new ResponseEntity<>(flightService.getAllFlights(), HttpStatus.OK);
    }

    @PostMapping("add")
    public String addFlight(@RequestBody Flight flight) {
        return flightService.addFlight(flight);
    }

    @DeleteMapping("delete")
    public String deleteFlight(@RequestBody Flight flight) {
        return flightService.deleteFlight(flight);
    }
}

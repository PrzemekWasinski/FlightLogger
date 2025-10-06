package com.przemek.flight_logger.controller;

import com.przemek.flight_logger.model.Flight;
import com.przemek.flight_logger.service.FlightService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("flights")
public class FlightController {

    @Autowired
    FlightService flightService;

    //Get all flights
    @GetMapping("all")
    public ResponseEntity<List<Flight>> getAllFlights() {
        return new ResponseEntity<>(
                flightService.getAllFlights(),
                HttpStatus.OK
        );
    }

    //Get a single flight
    @GetMapping("flight/{id}")
    public ResponseEntity<Flight> getFlightById(@PathVariable Long id) {
        return flightService.getFlightById(id)
                .map(flight -> new ResponseEntity<>(flight, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    //Add a new flight
    @PostMapping("add")
    public ResponseEntity<Boolean> addFlight(@RequestBody Flight flight) {
        return new ResponseEntity<>(
                flightService.addFlight(flight),
                HttpStatus.OK
        );
    }

    //Delete a flight
    @DeleteMapping("delete")
    public ResponseEntity<Boolean> deleteFlight(@RequestBody Flight flight) {
        boolean response = flightService.deleteFlight(flight);

        return new ResponseEntity<>(
                response,
                HttpStatus.OK
        );
    }

    //Update a flight
    @PutMapping("update/{id}")
    public ResponseEntity<Boolean> updateFlight(@PathVariable Long id, @RequestBody Flight flight) {
        boolean result = flightService.updateFlight(id, flight);

        if (result) {
            return new ResponseEntity<>(
                    true,
                    HttpStatus.OK
            );
        } else {
            return new ResponseEntity<>(
                    false,
                    HttpStatus.NOT_FOUND
            );
        }
    }
}

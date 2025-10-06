package com.przemek.flight_logger.service;

import com.przemek.flight_logger.repository.FlightRepository;
import com.przemek.flight_logger.model.Flight;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FlightService {

    private final FlightRepository flightRepository;

    @Autowired
    public FlightService(FlightRepository flightRepository) {
        this.flightRepository = flightRepository;
    }

    public List<Flight> getAllFlights() {
        return flightRepository.findAll();
    }

    public Optional<Flight> getFlightById(Long id) {
        return flightRepository.findById(id);
    }

    public boolean addFlight(Flight flight) {
        flightRepository.save(flight);
        return true;
    }

    public boolean deleteFlight(Flight flight) {
        flightRepository.delete(flight);
        return true;
    }

    public boolean updateFlight(Long id, Flight updatedFlight) {
        return flightRepository.findById(id).map(existingFlight -> {

            existingFlight.setDate(updatedFlight.getDate());
            existingFlight.setPlaneManufacturer(updatedFlight.getPlaneManufacturer());
            existingFlight.setPlaneModel(updatedFlight.getPlaneModel());
            existingFlight.setPlaneRegistration(updatedFlight.getPlaneRegistration());
            existingFlight.setSpecial(updatedFlight.getSpecial());
            existingFlight.setAirline(updatedFlight.getAirline());
            existingFlight.setAirlineClass(updatedFlight.getAirlineClass());
            existingFlight.setFlightNumber(updatedFlight.getFlightNumber());
            existingFlight.setCruisingAltitude(updatedFlight.getCruisingAltitude());
            existingFlight.setDepAirport(updatedFlight.getDepAirport());
            existingFlight.setArrAirport(updatedFlight.getArrAirport());

            flightRepository.save(existingFlight);
            return true;
        }).orElse(false);
    }
}

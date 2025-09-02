package com.przemek.flight_logger.service;

import com.przemek.flight_logger.dao.FlightDao;
import com.przemek.flight_logger.model.Flight;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FlightService {

    @Autowired
    FlightDao flightDao;

    public List<Flight> getAllFlights() {
        return flightDao.findAll();
    }

    public String addFlight(Flight flight) {
        flightDao.save(flight);
        return "Flight added";
    }

    public String deleteFlight(Flight flight) {
        flightDao.delete(flight);
        return "Flight deleted";
    }
}

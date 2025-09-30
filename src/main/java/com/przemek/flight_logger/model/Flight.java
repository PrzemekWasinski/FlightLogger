package com.przemek.flight_logger.model;

import lombok.Data;
import jakarta.persistence.*;

@Data
@Entity
public class Flight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String date;
    private String planeManufacturer;
    private String planeModel;
    private String planeRegistration;
    private String special;
    private String airline;
    private String airlineClass;
    private String flightNumber;
    private int cruisingAltitude;
    private String depAirport;;
    private String arrAirport;

    //Getters

    public Long getId() {
        return id;
    }

    public String getDate() {
        return date;
    }

    public String getPlaneManufacturer() {
        return planeManufacturer;
    }

    public String getPlaneModel() {
        return planeModel;
    }

    public String getPlaneRegistration() {
        return planeRegistration;
    }

    public String getSpecial() {
        return special;
    }

    public String getAirline() {
        return airline;
    }

    public String getAirlineClass() {
        return airlineClass;
    }

    public String getFlightNumber() {
        return flightNumber;
    }

    public int getCruisingAltitude() {
        return cruisingAltitude;
    }

    public String getDepAirport() {
        return depAirport;
    }

    public String getArrAirport() {
        return arrAirport;
    }

    //Setters

    public void setId(Long id) {
        this.id = id;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public void setPlaneManufacturer(String planeManufacturer) {
        this.planeManufacturer = planeManufacturer;
    }

    public void setPlaneModel(String planeModel) {
        this.planeModel = planeModel;
    }

    public void setPlaneRegistration(String planeRegistration) {
        this.planeRegistration = planeRegistration;
    }

    public void setSpecial(String special) {
        this.special = special;
    }

    public void setAirline(String airline) {
        this.airline = airline;
    }

    public void setAirlineClass(String airlineClass) {
        this.airlineClass = airlineClass;
    }

    public void setFlightNumber(String flightNumber) {
        this.flightNumber = flightNumber;
    }

    public void setCruisingAltitude(int cruisingAltitude) {
        this.cruisingAltitude = cruisingAltitude;
    }

    public void setDepAirport(String depAirport) {
        this.depAirport = depAirport;
    }

    public void setArrAirport(String arrAirport) {
        this.arrAirport = arrAirport;
    }

}

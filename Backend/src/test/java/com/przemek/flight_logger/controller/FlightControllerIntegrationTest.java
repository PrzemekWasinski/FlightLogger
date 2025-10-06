import com.fasterxml.jackson.databind.ObjectMapper;
import com.przemek.flight_logger.model.Flight;
import com.przemek.flight_logger.repository.FlightRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.MediaType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.mock.http.server.reactive.MockServerHttpRequest.post;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class FlightControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FlightRepository flightRepository;

    @Test
    void testAddAndGetFlight() throws Exception {
        Flight flight = new Flight();
        flight.setAirline("Lufthansa");
        flight.setFlightNumber("LH456");
        flight.setDepAirport("FRA");
        flight.setArrAirport("WAW");

        mockMvc.perform(post("/flights/add")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(flight)))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));

        mockMvc.perform(get("/flights/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].airline").value("Lufthansa"));
    }
}

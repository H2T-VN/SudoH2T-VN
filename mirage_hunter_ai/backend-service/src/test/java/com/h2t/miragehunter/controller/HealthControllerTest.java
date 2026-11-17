package com.h2t.miragehunter.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.h2t.miragehunter.client.AiHealthClient;
import com.h2t.miragehunter.dto.HealthResponse;
import com.h2t.miragehunter.exception.AiServiceUnavailableException;
import com.h2t.miragehunter.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(HealthController.class)
@Import(GlobalExceptionHandler.class)
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AiHealthClient aiHealthClient;

    @Test
    void returnsBackendHealth() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("backend-service"));
    }

    @Test
    void returnsStructured503WhenAiIsUnavailable() throws Exception {
        when(aiHealthClient.checkHealth())
                .thenThrow(new AiServiceUnavailableException("AI service is not reachable"));

        mockMvc.perform(get("/api/health/ai"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.error").value("AI_SERVICE_UNAVAILABLE"))
                .andExpect(jsonPath("$.path").value("/api/health/ai"));
    }

    @Test
    void proxiesHealthyAiResponse() throws Exception {
        when(aiHealthClient.checkHealth()).thenReturn(new HealthResponse("UP", "ai-service"));

        mockMvc.perform(get("/api/health/ai"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("ai-service"));
    }
}

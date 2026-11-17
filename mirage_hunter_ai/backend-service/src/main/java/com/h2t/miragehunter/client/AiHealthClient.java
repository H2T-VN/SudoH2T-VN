package com.h2t.miragehunter.client;

import com.h2t.miragehunter.dto.HealthResponse;
import com.h2t.miragehunter.exception.AiServiceUnavailableException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class AiHealthClient {

    private final RestClient restClient;

    public AiHealthClient(RestClient aiRestClient) {
        this.restClient = aiRestClient;
    }

    public HealthResponse checkHealth() {
        try {
            HealthResponse response = restClient.get()
                    .uri("/health")
                    .retrieve()
                    .body(HealthResponse.class);
            if (response == null || !"UP".equalsIgnoreCase(response.status())) {
                throw new AiServiceUnavailableException("AI service returned an unhealthy response");
            }
            return response;
        } catch (RestClientException exception) {
            throw new AiServiceUnavailableException("AI service is not reachable", exception);
        }
    }
}

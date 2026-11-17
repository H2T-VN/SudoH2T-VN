package com.h2t.miragehunter.controller;

import com.h2t.miragehunter.client.AiHealthClient;
import com.h2t.miragehunter.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final AiHealthClient aiHealthClient;

    public HealthController(AiHealthClient aiHealthClient) {
        this.aiHealthClient = aiHealthClient;
    }

    @GetMapping
    public HealthResponse health() {
        return new HealthResponse("UP", "backend-service");
    }

    @GetMapping("/ai")
    public HealthResponse aiHealth() {
        return aiHealthClient.checkHealth();
    }
}

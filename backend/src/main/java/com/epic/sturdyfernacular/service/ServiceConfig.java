package com.epic.sturdyfernacular.service;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ServiceConfig {

    @Bean
    public TicketStateMachine ticketStateMachine() {
        return new TicketStateMachine();
    }
}

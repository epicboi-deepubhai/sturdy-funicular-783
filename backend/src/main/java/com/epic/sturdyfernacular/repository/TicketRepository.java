package com.epic.sturdyfernacular.repository;

import com.epic.sturdyfernacular.domain.Ticket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    /**
     * List/search tickets. Optional status equality (passed as String name, or null);
     * optional case-insensitive partial match on title or description (ILIKE).
     * Keyword must already be escaped for % and _ by the caller; blank keyword
     * should be passed as null. Status is a String so Hibernate does not infer a
     * null enum param as bytea.
     */
    @Query(value = """
            SELECT * FROM ticket t
            WHERE (:status IS NULL OR t.status = :status)
              AND (:keyword IS NULL
                   OR t.title ILIKE '%' || :keyword || '%' ESCAPE '\\'
                   OR t.description ILIKE '%' || :keyword || '%' ESCAPE '\\')
            """,
            countQuery = """
            SELECT count(*) FROM ticket t
            WHERE (:status IS NULL OR t.status = :status)
              AND (:keyword IS NULL
                   OR t.title ILIKE '%' || :keyword || '%' ESCAPE '\\'
                   OR t.description ILIKE '%' || :keyword || '%' ESCAPE '\\')
            """,
            nativeQuery = true)
    Page<Ticket> search(@Param("status") String status,
                        @Param("keyword") String keyword,
                        Pageable pageable);
}

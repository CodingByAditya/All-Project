package com.adi.repository;

import com.adi.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StudentRepository extends JpaRepository<Student, Long> {
    List<Student> findByRegistrationNo(String registrationNo);
    Student findTopByRegistrationNoOrderByIdDesc(String registrationNo);
}
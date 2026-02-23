package com.adi.controller;

import com.adi.entity.Student;
import com.adi.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.FileOutputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@RestController
@CrossOrigin
public class AttendanceController {

    @Autowired
    private StudentRepository repo;

    private static final String IMAGE_DIR = "uploads/photos/";

    private static String activeToken = null;
    private static long tokenExpiryMs = 0;
    private static final long TOKEN_VALID_MS = 30_000;

    // Teacher starts session
    @GetMapping("/session/start")
    public ResponseEntity<Map<String, Object>> startSession() {
        activeToken = UUID.randomUUID().toString();
        tokenExpiryMs = System.currentTimeMillis() + TOKEN_VALID_MS;

        return ResponseEntity.ok(Map.of(
                "token", activeToken,
                "expiresInSeconds", TOKEN_VALID_MS / 1000
        ));
    }

    // Student marks attendance (QR + Photo only)
    @PostMapping("/student/add")
    public ResponseEntity<String> addStudent(@RequestBody Map<String, String> data) throws Exception {

        String name = data.get("name");
        String regNo = data.get("registrationNo");
        String image = data.get("image");
        String token = data.get("token");

        if (name == null || name.trim().isEmpty())
            return ResponseEntity.badRequest().body("Enter your Name.");

        if (regNo == null || regNo.trim().isEmpty())
            return ResponseEntity.badRequest().body("Enter Registration No.");

        if (image == null || !image.contains(","))
            return ResponseEntity.badRequest().body("Photo not captured. Turn ON camera.");

        //  Token validation
        if (token == null || token.trim().isEmpty())
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Scan teacher QR first.");

        if (activeToken == null || System.currentTimeMillis() > tokenExpiryMs)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Session expired. Ask teacher to start again.");

        if (!activeToken.equals(token.trim()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Wrong QR. Scan correct teacher QR.");

        name = name.trim();
        regNo = regNo.trim();

        //  block same regNo with different name
        Student existing = repo.findTopByRegistrationNoOrderByIdDesc(regNo);
        if (existing != null && existing.getName() != null &&
                !existing.getName().equalsIgnoreCase(name)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("This Registration No belongs to: " + existing.getName());
        }

        //  Save image file
        String base64 = image.split(",")[1];
        byte[] bytes = Base64.getDecoder().decode(base64);
        String fileName = UUID.randomUUID() + ".png";

        File dir = new File(IMAGE_DIR);
        if (!dir.exists()) dir.mkdirs();

        try (FileOutputStream fos = new FileOutputStream(IMAGE_DIR + fileName)) {
            fos.write(bytes);
        }

        //  Save DB record
        Student s = new Student();
        s.setName(name);
        s.setRegistrationNo(regNo);
        s.setPhoto(fileName);
        s.setAttendanceDate(LocalDate.now());
        s.setAttendanceTime(LocalTime.now());
        repo.save(s);

        return ResponseEntity.ok("✅ Attendance Saved Successfully");
    }

    // View all
    @GetMapping("/students")
    public List<Student> getAllStudents() {
        return repo.findAll();
    }

    //  Report by regNo
    @GetMapping("/student/report/{regNo}")
    public List<Student> getStudentReport(@PathVariable String regNo) {
        return repo.findByRegistrationNo(regNo);
    }
}
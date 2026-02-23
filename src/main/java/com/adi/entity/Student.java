package com.adi.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "student")
public class Student {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String name;

	@Column(name = "registration_no")
	private String registrationNo;

	private String photo;

	private LocalDate attendanceDate;
	private LocalTime attendanceTime;

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public String getRegistrationNo() {
		return registrationNo;
	}

	public String getPhoto() {
		return photo;
	}

	public LocalDate getAttendanceDate() {
		return attendanceDate;
	}

	public LocalTime getAttendanceTime() {
		return attendanceTime;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public void setName(String name) {
		this.name = name;
	}

	public void setRegistrationNo(String registrationNo) {
		this.registrationNo = registrationNo;
	}

	public void setPhoto(String photo) {
		this.photo = photo;
	}

	public void setAttendanceDate(LocalDate attendanceDate) {
		this.attendanceDate = attendanceDate;
	}

	public void setAttendanceTime(LocalTime attendanceTime) {
		this.attendanceTime = attendanceTime;
	}
}
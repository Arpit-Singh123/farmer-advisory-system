package com.example.farmeradvisory;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "farmer_queries")
public class FarmerQuery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String district;
    private String village;
    private String soilType;
    private String crop;
    private String issue;
    private String language;

    @Column(columnDefinition = "TEXT")
    private String advisory;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // ── Getters and Setters ──────────────────────────

    public Long getId() { return id; }
    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }
    public String getVillage() { return village; }
    public void setVillage(String village) { this.village = village; }
    public String getSoilType() { return soilType; }
    public void setSoilType(String soilType) { this.soilType = soilType; }
    public String getCrop() { return crop; }
    public void setCrop(String crop) { this.crop = crop; }
    public String getIssue() { return issue; }
    public void setIssue(String issue) { this.issue = issue; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public String getAdvisory() { return advisory; }
    public void setAdvisory(String advisory) { this.advisory = advisory; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
package com.example.farmeradvisory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/queries")
public class QueryController {

    @Autowired
    private FarmerQueryRepository repository;

    // ── Save a query (called from frontend after advisory is generated) ──
    @PostMapping("/save")
    public Map<String, Object> saveQuery(@RequestBody Map<String, String> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            FarmerQuery query = new FarmerQuery();
            query.setDistrict(body.get("district"));
            query.setVillage(body.get("village"));
            query.setSoilType(body.get("soilType"));
            query.setCrop(body.get("crop"));
            query.setIssue(body.get("issue"));
            query.setLanguage(body.get("language"));
            query.setAdvisory(body.get("advisory"));
            repository.save(query);
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        return result;
    }

    // ── Get all queries (called from admin dashboard) ──
    @GetMapping("/all")
    public Map<String, Object> getAllQueries() {
        Map<String, Object> result = new HashMap<>();
        try {
            List<FarmerQuery> queries = repository.findAllByOrderByCreatedAtDesc();
            List<Map<String, Object>> list = new ArrayList<>();
            for (FarmerQuery q : queries) {
                Map<String, Object> item = new HashMap<>();
                item.put("id",        q.getId());
                item.put("district",  q.getDistrict());
                item.put("village",   q.getVillage());
                item.put("soilType",  q.getSoilType());
                item.put("crop",      q.getCrop());
                item.put("issue",     q.getIssue());
                item.put("language",  q.getLanguage());
                item.put("advisory",  q.getAdvisory());
                item.put("createdAt", q.getCreatedAt() != null ? q.getCreatedAt().toString() : "");
                list.add(item);
            }
            result.put("success", true);
            result.put("data", list);
        } catch (Exception e) {
            result.put("success", false);
            result.put("data", new ArrayList<>());
        }
        return result;
    }

    // ── Delete all queries (admin clear) ──
    @DeleteMapping("/clear")
    public Map<String, Object> clearAllQueries() {
        Map<String, Object> result = new HashMap<>();
        try {
            repository.deleteAll();
            result.put("success", true);
        } catch (Exception e) {
            result.put("success", false);
        }
        return result;
    }
}
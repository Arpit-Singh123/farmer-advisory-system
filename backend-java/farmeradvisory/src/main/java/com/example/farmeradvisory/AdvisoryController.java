package com.example.farmeradvisory;

import org.springframework.web.bind.annotation.*;
import java.io.*;
import java.net.*;
import java.util.*;
import java.net.URI;

@RestController
@CrossOrigin
public class AdvisoryController {

    @PostMapping("/api/advisory")
    public String getAdvisory(@RequestBody Map<String, String> body) throws Exception {

        String prompt = body.get("prompt");

        HttpURLConnection conn = (HttpURLConnection) URI.create("https://integrate.api.nvidia.com/v1/chat/completions").toURL().openConnection();

        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Authorization", "Bearer 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");
        conn.setRequestProperty("Accept", "application/json");
        conn.setDoOutput(true);

        // ✅ escape prompt properly
        String safePrompt = prompt
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "");

        // ✅ UPDATED JSON (Moonshot model)
        String json = "{"
        + "\"model\":\"moonshotai/kimi-k2.5\","
        + "\"messages\":[{\"role\":\"user\",\"content\":\"" + safePrompt + "\"}],"
        + "\"max_tokens\":1024,"
        + "\"temperature\":1.0,"
        + "\"top_p\":1.0,"
        + "\"chat_template_kwargs\":{\"thinking\":false}"
        + "}";

        // send request
        OutputStream os = conn.getOutputStream();
        os.write(json.getBytes("utf-8"));
        os.flush();

        // handle response
        InputStream is;
        if (conn.getResponseCode() >= 400) {
            is = conn.getErrorStream();
        } else {
            is = conn.getInputStream();
        }

        BufferedReader br = new BufferedReader(new InputStreamReader(is, "utf-8"));
        String line;
        StringBuilder response = new StringBuilder();

        while ((line = br.readLine()) != null) {
            response.append(line.trim());
        }

        System.out.println("MOONSHOT RESPONSE: " + response.toString());

        return response.toString();
    }
}
package com.example.farmeradvisory;

import org.springframework.web.bind.annotation.*;
import java.io.*;
import java.net.*;
import java.util.Map;
import java.nio.charset.StandardCharsets;

@RestController
@CrossOrigin(origins = "*")
public class AdvisoryController {

    @PostMapping("/api/advisory")
    public String getAdvisory(@RequestBody Map<String, String> body) {

        try {
            String prompt = body.get("prompt");

            // ✅ Null check
            if (prompt == null || prompt.isEmpty()) {
                return "{\"error\":\"Prompt is missing\"}";
            }

            HttpURLConnection conn = (HttpURLConnection) URI
                    .create("https://integrate.api.nvidia.com/v1/chat/completions")
                    .toURL()
                    .openConnection();

            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);

            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");

            // ⚠️ IMPORTANT: replace with env variable later
            conn.setRequestProperty("Authorization", "Bearer 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");

            conn.setRequestProperty("Accept", "application/json");
            conn.setDoOutput(true);

            // escape prompt
            String safePrompt = prompt
                    .replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "");

            String json = "{"
                    + "\"model\":\"moonshotai/kimi-k2.5\","
                    + "\"messages\":[{\"role\":\"user\",\"content\":\"" + safePrompt + "\"}],"
                    + "\"max_tokens\":400,"
                    + "\"temperature\":1.0,"
                    + "\"top_p\":1.0,"
                    + "\"chat_template_kwargs\":{\"thinking\":false}"
                    + "}";

            OutputStream os = conn.getOutputStream();
            os.write(json.getBytes(StandardCharsets.UTF_8));
            os.flush();

            InputStream is = null;
            int status = conn.getResponseCode();

            if (status >= 400) {
                is = conn.getErrorStream();
            } else {
                is = conn.getInputStream();
            }

            if (is == null) {
                return "{\"error\":\"No response from API\"}";
            }

            BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            String line;
            StringBuilder response = new StringBuilder();

            while ((line = br.readLine()) != null) {
                response.append(line.trim());
            }

            System.out.println("MOONSHOT RESPONSE: " + response.toString());

            return response.toString();

        } catch (Exception e) {
            e.printStackTrace();
            return "{\"error\":\"Backend error: " + e.getMessage() + "\"}";
        }
    }
}
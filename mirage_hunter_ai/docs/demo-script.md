# Demo script

1. Start the Compose stack and open `http://localhost:3000`.
2. Show the dashboard backend and AI connection indicators.
3. Open **Tạo thử nghiệm** and point out the image/label form and disabled run button. Explain that execution is intentionally not enabled in this scaffold.
4. Open **Model**, **Kết quả** and **Minimization** to show the explicit `Chưa triển khai` states.
5. In a terminal, call `/api/health` and `/api/health/ai`.
6. Optionally stop the AI container and call `/api/health/ai` again to show the structured HTTP 503 response, then restart it.

Do not present placeholder pages as model output, accuracy, benchmark data or a successful AI hunt.

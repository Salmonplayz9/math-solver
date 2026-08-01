import express from "express";
import cors from "cors";
import dotenv from "dotenv";


dotenv.config();

const app = express();


app.use(cors());
app.use(express.json());

app.post("/solve", async (req, res) => {

    try {

        const { equation } = req.body;

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5500",
                    "X-Title": "AI Math Solver"
                },
                body: JSON.stringify({
                    model: "openai/gpt-oss-20b:free",
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert mathematics tutor. Solve every problem step by step and finish with Final Answer."
                        },
                        {
                            role: "user",
                            content: equation
                        }
                    ],
                    temperature: 0.2
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(data);
            return res.status(response.status).json(data);
        }

        res.json({
            answer: data.choices[0].message.content
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            answer: "Server Error"
        });

    }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
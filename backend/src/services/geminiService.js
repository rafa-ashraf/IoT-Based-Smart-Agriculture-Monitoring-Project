/*  const { GoogleGenAI } = require("@google/genai");
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

async function analyzeSensorData(data) {
  const result = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
      You are an agricultural expert.
      Analyze this sensor data:
      - Temperature: ${data.temperature} °C
      - Humidity: ${data.humidity} %
      - Soil Moisture: ${data.moisture} %
      - Light: ${data.light}
      
      Provide:
      Status: good / warning / critical
      Reason: one short sentence
      Action: one short recommendation
    `,
  });

  return result.output_text || "AI analysis unavailable.";
}

module.exports = { analyzeSensorData }; */

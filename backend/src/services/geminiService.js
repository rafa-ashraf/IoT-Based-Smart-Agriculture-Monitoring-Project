const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeSensorData(data) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
  You are an agricultural expert.

  Analyze this sensor data and give recommendations:
  - Temperature: ${data.temperature} °C
  - Humidity: ${data.humidity} %
  - Soil Moisture: ${data.moisture} %
  - Light: ${data.light}

  Give:
  1. Status (good/warning/critical)
  2. Short explanation
  3. Actionable recommendation
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;

  return response.text();
}

module.exports = { analyzeSensorData };
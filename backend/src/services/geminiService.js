const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeSensorData(data) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
  You are an agricultural AI assistant.

  Analyze the following sensor data and give insights:

  Temperature: ${data.temperature} °C
  Humidity: ${data.humidity} %
  Soil Moisture: ${data.moisture} %

  Provide:
  - Current condition
  - Any risks
  - Recommended actions
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;

  return response.text();
}

module.exports = { analyzeSensorData };
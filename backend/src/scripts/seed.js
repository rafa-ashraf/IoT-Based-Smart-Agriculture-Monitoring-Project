const { InfluxDB, Point } = require("@influxdata/influxdb-client");
require("dotenv").config();

const org = process.env.ORG;
const bucket = process.env.BUCKET;

const client = new InfluxDB({
  url: process.env.INFLUXDB_URL,
  token: process.env.INFLUXDB_TOKEN,
});

const writeClient = client.getWriteApi(org, bucket, "ns");

if (process.argv.length > 3) {
  console.error(
    "Usage: node seed.js <DAYS>\n" +
      "\tDAYS: Optional number of days of data to generate (default: 365)",
  );
  process.exit(1);
}

const DAYS = parseInt(process.argv[2]) || 365;
const INTERVAL_MINUTES = 15;
const TOTAL_POINTS = (60 / INTERVAL_MINUTES) * 24 * DAYS; // 15-minute intervals for 1 year
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

function makePoint(index, timestamp, uptimeStart) {
  const wave = Math.sin(index / 8);

  const temperatureC = 23 + wave * 5 + (Math.random() - 0.5);
  const humidityPct = 58 - wave * 9 + (Math.random() - 0.5) * 2;
  const pressurePa = 101325 + wave * 220 + (Math.random() - 0.5) * 30;
  const soilMoisturePct =
    42 + Math.sin(index / 10) * 10 + (Math.random() - 0.5) * 2;
  const lightRaw =
    580 + Math.max(0, Math.sin(index / 6)) * 260 + Math.random() * 30;

  return new Point("agri_telemetry")
    .tag("device_id", "seed-device-01")
    .intField("uptime_s", uptimeStart + index * INTERVAL_MINUTES * 60)
    .intField("wifi_rssi_dbm", Math.round(-58 + Math.sin(index / 7) * 4))
    .floatField("temperature_c", Number(temperatureC.toFixed(2)))
    .floatField("humidity_pct", Number(humidityPct.toFixed(2)))
    .floatField("pressure_pa", Number(pressurePa.toFixed(2)))
    .floatField("soil_moisture_pct", Number(soilMoisturePct.toFixed(2)))
    .floatField("light_raw", Number(lightRaw.toFixed(2)))
    .timestamp(timestamp);
}

async function seedInflux() {
  const startTime = new Date(Date.now() - (TOTAL_POINTS - 1) * INTERVAL_MS);
  const uptimeStart = Math.floor(Math.random() * 5000);

  for (let i = 0; i < TOTAL_POINTS; i += 1) {
    const timestamp = new Date(startTime.getTime() + i * INTERVAL_MS);
    writeClient.writePoint(makePoint(i, timestamp, uptimeStart));
  }

  await writeClient.close();

  console.log(
    `Seeding complete: wrote ${TOTAL_POINTS} points to "${process.env.BUCKET}" (${process.env.ORG})`,
  );
}

seedInflux().catch(async (error) => {
  console.error("Seeding failed:", error);
  try {
    await writeClient.close();
  } catch (closeError) {
    console.error("Error closing write API after failure:", closeError);
  }
  process.exit(1);
});

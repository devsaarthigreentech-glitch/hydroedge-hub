// ============================================================================
// lib/nano-mqtt.ts — singleton MQTT client for publishing Nano /cmd frames.
// ----------------------------------------------------------------------------
// Mirrors the lib/db.ts globalThis-singleton pattern so Next.js hot-reload
// reuses one broker connection instead of leaking a new one per request.
// Requires:  npm install mqtt
// Broker:    NANO_BROKER_URL (default mqtt://127.0.0.1:8883 — plaintext, same box)
// ============================================================================

import mqtt, { MqttClient } from 'mqtt';

const g = globalThis as unknown as { nanoMqtt?: MqttClient };

function client(): MqttClient {
  if (!g.nanoMqtt) {
    const url = process.env.NANO_BROKER_URL || 'mqtt://127.0.0.1:8883';
    g.nanoMqtt = mqtt.connect(url, { reconnectPeriod: 3000, connectTimeout: 8000 });
    g.nanoMqtt.on('error', (e) => console.error('nano mqtt error:', e.message));
  }
  return g.nanoMqtt;
}

export function publishNanoCommand(imei: string, payload: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const topic = `sgt/nano/${imei}/cmd`;
    const c = client();
    const body = JSON.stringify(payload);
    const doPublish = () =>
      c.publish(topic, body, { qos: 1 }, (err) => (err ? reject(err) : resolve()));
    if (c.connected) doPublish();
    else c.once('connect', doPublish);
    setTimeout(() => reject(new Error('MQTT publish timed out')), 8000);
  });
}
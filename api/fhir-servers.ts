import type { VercelRequest, VercelResponse } from "@vercel/node";

// In-memory storage for demo
const demoServers = [
  {
    id: 1,
    url: "https://hapi.fhir.org/baseR4",
    authType: "none",
    username: null,
    password: null,
    token: null,
    timeout: 30,
    lastUsed: new Date(),
    userId: 1
  },
  {
    id: 2,
    url: "https://r4.smarthealthit.org",
    authType: "none",
    username: null,
    password: null,
    token: null,
    timeout: 30,
    lastUsed: new Date(),
    userId: 1
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.status(200).json(demoServers);
  } else if (req.method === 'POST') {
    const newServer = {
      id: demoServers.length + 1,
      ...req.body,
      userId: 1,
      lastUsed: new Date()
    };
    demoServers.push(newServer);
    res.status(201).json(newServer);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}
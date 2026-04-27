module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const { name, industry, desc, users, deadline, features, tech } = req.body;
  if (!name || !desc) { res.status(400).json({ error: 'Name and description required.' }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'API key not configured.' }); return; }
  const prompt = `You are a strict Business Analyst and Software Architect. Generate a BRD and TRD for this project. Return ONLY valid JSON, no markdown.
PROJECT: Name: ${name}, Industry: ${industry||'N/A'}, Description: ${desc}, Users: ${users||'N/A'}, Features: ${features||'N/A'}, Tech: ${tech||'N/A'}, Deadline: ${deadline||'N/A'}
{"brd":{"project_overview":"","business_objective":"","stakeholders":[],"business_requirements":[],"functional_requirements":[],"success_metrics":[],"risks":[]},"trd":{"system_overview":"","architecture":"","technology_stack":[{"layer":"","tech":""}],"database_design":[{"table":"","columns":""}],"api_requirements":[{"method":"","endpoint":"","desc":""}],"security_requirements":[],"deployment_plan":""}}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await r.json();
    const raw = data.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    res.status(200).json(JSON.parse(raw));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

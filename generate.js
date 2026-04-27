module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { name, industry, desc, users, deadline, features, tech } = req.body;
  if (!name || !desc) { res.status(400).json({ error: 'Project name and description are required.' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'API key not configured.' }); return; }

  const prompt = `You are a strict Business Analyst and Software Architect.
Generate a comprehensive BRD and TRD for the project below.

PROJECT DETAILS:
- Project Name: ${name}
- Industry: ${industry || 'Not specified'}
- Description: ${desc}
- Target Users: ${users || 'Not specified'}
- Key Features: ${features || 'Not specified'}
- Preferred Technology: ${tech || 'Not specified'}
- Deadline: ${deadline || 'Not specified'}

Return ONLY valid raw JSON — no markdown, no explanation:
{
  "brd": {
    "project_overview": "2-3 sentence summary",
    "business_objective": "1-2 sentence objective",
    "stakeholders": ["Role — responsibility"],
    "business_requirements": ["short bullet"],
    "functional_requirements": ["feature bullet"],
    "success_metrics": ["metric with target"],
    "risks": ["risk — mitigation"]
  },
  "trd": {
    "system_overview": "2-3 sentence technical summary",
    "architecture": "architecture pattern and layers",
    "technology_stack": [{"layer": "Frontend", "tech": "technologies"}],
    "database_design": [{"table": "name", "columns": "col1, col2"}],
    "api_requirements": [{"method": "POST", "endpoint": "/api/path", "desc": "description"}],
    "security_requirements": ["security point"],
    "deployment_plan": "step-by-step summary"
  }
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      res.status(response.status).json({ error: err.error?.message || 'Anthropic API error' });
      return;
    }

    const data = await response.json();
    const raw = data.content.map(b => b.text || '').join('');
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.status(200).json(parsed);

  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
}

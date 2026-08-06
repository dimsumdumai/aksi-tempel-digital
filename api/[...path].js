export default function handler(req, res) {
  const slug = req.query.path || [];
  res.status(200).json({ ok: true, slug, url: req.url });
}

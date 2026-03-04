export default function handler(req, res) {
  res.json({
    ok: true,
    env: {
      hasFalKey: !!process.env.FAL_KEY,
      hasTencentId: !!process.env.TENCENT_SECRET_ID,
      hasTencentKey: !!process.env.TENCENT_SECRET_KEY,
      region: process.env.TENCENT_REGION || 'not set',
    },
  });
}
